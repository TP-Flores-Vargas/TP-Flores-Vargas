import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const formatLocalTimestamp = (isoString: string) =>
  dayjs(isoString).local().format("YYYY-MM-DD HH:mm:ss");

export const formatUtcTimestamp = (isoString: string) =>
  `${dayjs(isoString).utc().format("HH:mm:ss")} UTC`;

export const formatFullLocal = (isoString: string) =>
  dayjs(isoString).local().format("dddd, D [de] MMMM YYYY, h:mm A");
