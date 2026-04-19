import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.2'],
    http_req_duration: ['p(95)<5000'],
  },
};

const baseUrl = __ENV.BASE_URL || __ENV.K6_BASE_URL || 'https://example.com';

function parseExpectedStatuses(rawValue) {
  if (!rawValue) {
    return [200, 301, 302];
  }

  return rawValue
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value));
}

const expectedStatuses = parseExpectedStatuses(__ENV.EXPECTED_STATUSES);

export default function smokeTest() {
  const response = http.get(baseUrl, {
    tags: {
      name: 'smoke-homepage',
    },
  });

  check(response, {
    'status is expected': (r) => expectedStatuses.includes(r.status),
  });

  sleep(1);
}
