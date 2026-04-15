/* eslint-disable */

import http from "k6/http";
import { check, sleep } from "k6";

const targetBaseUrl = __ENV.BASE_URL || __ENV.K6_BASE_URL || "https://example.com";
const parsedExpectedStatuses = (__ENV.EXPECTED_STATUSES || "200")
  .split(",")
  .map((value) => parseInt(value.trim(), 10))
  .filter((value) => Number.isInteger(value));

const expectedStatuses = parsedExpectedStatuses.length > 0 ? parsedExpectedStatuses : [200];
http.setResponseCallback(http.expectedStatuses(...expectedStatuses));

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const response = http.get(targetBaseUrl, { tags: { scenario: "smoke" } });

  check(response, {
    "status is expected": (result) => expectedStatuses.includes(result.status),
  });

  sleep(1);
}
