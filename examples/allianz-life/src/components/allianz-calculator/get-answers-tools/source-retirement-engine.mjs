/**
 * Exact public Allianz calculator service functions.
 * Source asset: retirement-income.js
 * Full asset SHA-256: 83f5399a46adce2269b43e014022961f6adfb05958c62dc49b8d38ebc8e30a94
 * Raw UTF-8 source byte range: [2529708, 2530052).
 * Function block SHA-256: d721c4fd565f3fde17818bd9191465d15f3e58cdff230c8426c40608e57f4e55
 * No formula changes; local arithmetic only. Source validation/formatting are separate.
 */

/* BEGIN EXACT SOURCE FUNCTIONS */
function compute(principal, interest, payments) {
  let vpv;
  let count = 0;
  let denominator = 1;
  let i = interest / 100 / 12;
  let factor = 1 + i;
  payments *= 12;
  while (count < payments) {
    denominator = denominator * factor;
    count++;
  }
  vpv = 1 - 1 / denominator;
  vpv = vpv / i;
  vpv = principal * vpv;
  return vpv;
}
/* END EXACT SOURCE FUNCTIONS */

export { compute };
