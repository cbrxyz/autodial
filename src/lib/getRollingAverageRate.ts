import {now, parseDate} from "./time";
import stepify from "./stepify";
import aggregate from "./aggregate";
import {getGoalAge} from "./getGoalAge";
import {SID} from "./constants";
import {Datapoint, GoalVerbose, UnixDatapoint} from "./types";

// Take list of datapoints and a window (in seconds), return average rate in
// that window.
function avgrate(
    data: Datapoint[],
    window: number,
    weekendsOff: boolean,
): number {
  if (!data || !data.length) return 0;

  // convert daystamps to unixtimes
  const unixData: UnixDatapoint[] = data.map((p) => {
    return [parseDate(p.daystamp), p.value];
  });

  // now we can stepify the data and get a data function, df, that maps any
  // unixtime to the most recent y-value as of that unixtime:
  const df = stepify(unixData); // df is the data function
  const preTime = now() - window - 1;
  const valNow = df(now());
  const valBefore = df(preTime);
  const vdelta = valNow - valBefore;
  const divisor = weekendsOff ? window * 5 / 7 : window;

  return vdelta / divisor;
}

function autoSum(data: Datapoint[]): Datapoint[] {
  return data.reduce((prev: Datapoint[], p) => {
    const last = prev[prev.length - 1];
    const sum = last ? last.value + p.value : p.value;
    return [...prev, {...p, value: sum}];
  }, []);
}

// TODO: Accept per-period; default to second
export function getRollingAverageRate(g: GoalVerbose): number {
  const aggregatedPoints = aggregate(g.datapoints, g.aggday);
  const summed = g.kyoom ? autoSum(aggregatedPoints) : aggregatedPoints;

  // use min between 30 and the number of days the goal has been active
  const days = Math.min(30, getGoalAge(g) / 86400);
  return avgrate(summed, SID * days, g.weekends_off);
}
