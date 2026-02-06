import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("game tick", { seconds: 3 }, internal.engine.tick.run);

export default crons;
