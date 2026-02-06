import { query } from "./_generated/server";

export const recent = query({
  handler: async (ctx) => {
    return ctx.db
      .query("worldEvents")
      .withIndex("by_tick")
      .order("desc")
      .take(50);
  },
});
