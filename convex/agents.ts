import { query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return ctx.db.query("agents").collect();
  },
});
