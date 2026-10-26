import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { addMember } = await import("@/lib/members");

/** Banco simulado: logins existentes, membros do negócio e o último upsert. */
function fakeAdmin(state: { users: Record<string, string>; members: { user_id: string; status: string }[] }) {
  const upserts: Record<string, unknown>[] = [];
  const client = {
    auth: {
      admin: {
        createUser: async ({ email }: { email: string }) =>
          state.users[email]
            ? { data: { user: null }, error: { code: "email_exists" } }
            : { data: { user: { id: (state.users[email] = `novo-${email}`) } }, error: null },
      },
    },
    rpc: async (_fn: string, { target }: { target: string }) => ({ data: state.users[target] ?? null }),
    from: () => ({
      select: () => ({ eq: async () => ({ data: state.members }) }),
      upsert: async (row: Record<string, unknown>) => {
        upserts.push(row);
        return { error: null };
      },
    }),
  };
  return { client: client as never, upserts };
}

describe("addMember", () => {
  let state: Parameters<typeof fakeAdmin>[0];
  beforeEach(() => {
    state = { users: {}, members: [] };
  });

  it("o primeiro dono entra ativo, criando o login", async () => {
    const { client, upserts } = fakeAdmin(state);
    expect(await addMember(client, { businessId: "b1", email: "ana@x.com", phone: "+5585999998888" })).toBe("active");
    expect(upserts[0]).toMatchObject({ business_id: "b1", user_id: "novo-ana@x.com", status: "active", phone: "+5585999998888" });
  });

  it("quem chega depois de um membro ativo fica aguardando liberação", async () => {
    state.users["bia@x.com"] = "u2";
    state.members = [{ user_id: "u1", status: "active" }];
    const { client, upserts } = fakeAdmin(state);
    expect(await addMember(client, { businessId: "b1", email: "bia@x.com", phone: null })).toBe("pending");
    expect(upserts[0]).toMatchObject({ user_id: "u2", status: "pending" });
  });

  it("um membro ativo que ativa outra peça continua ativo", async () => {
    state.users["ana@x.com"] = "u1";
    state.members = [{ user_id: "u1", status: "active" }];
    const { client } = fakeAdmin(state);
    expect(await addMember(client, { businessId: "b1", email: "ana@x.com", phone: null })).toBe("active");
  });
});
