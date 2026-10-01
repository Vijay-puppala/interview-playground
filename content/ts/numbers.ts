// ---- p121_isPrime
function p121_isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

// ---- p122_primesUpTo
function p122_primesUpTo(n: number): number[] {
  if (n < 2) return [];
  const sieve = new Array<boolean>(n + 1).fill(true);
  sieve[0] = sieve[1] = false;
  for (let p = 2; p * p <= n; p++) {
    if (sieve[p]) for (let m = p * p; m <= n; m += p) sieve[m] = false;
  }
  return sieve.flatMap((ok, i) => (ok ? [i] : []));
}

// ---- p123_factorial
function p123_factorial(n: number): number {
  if (n < 0) throw new RangeError("factorial is undefined for negative numbers");
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// ---- p124_fibonacci
function p124_fibonacci(n: number): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

// ---- p125_fibonacciSeries
function p125_fibonacciSeries(n: number): number[] {
  const out: number[] = [];
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) {
    out.push(a);
    [a, b] = [b, a + b];
  }
  return out;
}

// ---- p126_gcd
function p126_gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

// ---- p127_lcm
function p127_lcm(a: number, b: number): number {
  return (a * b) / p126_gcd(a, b);
}

// ---- p128_isArmstrong
function p128_isArmstrong(n: number): boolean {
  const digits = String(n);
  return [...digits].reduce((sum, d) => sum + Number(d) ** digits.length, 0) === n;
}

// ---- p129_isPerfectNumber
function p129_isPerfectNumber(n: number): boolean {
  if (n <= 1) return false;
  let sum = 0;
  for (let d = 1; d <= n / 2; d++) if (n % d === 0) sum += d;
  return sum === n;
}

// ---- p130_reverseNumber
function p130_reverseNumber(n: number): number {
  const r = Number([...String(Math.abs(n))].reverse().join(""));
  return n < 0 ? -r : r;
}

// ---- p131_isPalindromeNumber
function p131_isPalindromeNumber(n: number): boolean {
  const s = String(n);
  return n >= 0 && s === [...s].reverse().join("");
}

// ---- p132_sumOfDigits
function p132_sumOfDigits(n: number): number {
  n = Math.abs(n);
  let total = 0;
  while (n) {
    total += n % 10;
    n = Math.floor(n / 10);
  }
  return total;
}

// ---- p133_digitalRoot
function p133_digitalRoot(n: number): number {
  return n === 0 ? 0 : 1 + ((n - 1) % 9);
}

// ---- p134_fastPower
function p134_fastPower(base: number, exp: number): number {
  if (exp < 0) return 1 / p134_fastPower(base, -exp);
  let result = 1;
  while (exp) {
    if (exp & 1) result *= base;
    base *= base;
    exp = Math.floor(exp / 2);
  }
  return result;
}

// ---- p135_isPowerOfTwo
function p135_isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

// ---- p136_countSetBits
function p136_countSetBits(n: number): number {
  let count = 0;
  while (n) {
    n &= n - 1;
    count++;
  }
  return count;
}

// ---- p137_decimalToBinary
function p137_decimalToBinary(n: number): string {
  if (n === 0) return "0";
  let bits = "";
  while (n) {
    bits = (n % 2) + bits;
    n = Math.floor(n / 2);
  }
  return bits;
}

// ---- p138_binaryToDecimal
function p138_binaryToDecimal(s: string): number {
  let n = 0;
  for (const bit of s) n = n * 2 + Number(bit);
  return n;
}

// ---- p139_primeFactors
function p139_primeFactors(n: number): number[] {
  const out: number[] = [];
  for (let d = 2; d * d <= n; d++) {
    while (n % d === 0) {
      out.push(d);
      n /= d;
    }
  }
  if (n > 1) out.push(n);
  return out;
}

// ---- p140_isHappyNumber
function p140_isHappyNumber(n: number): boolean {
  const seen = new Set<number>();
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    n = [...String(n)].reduce((sum, d) => sum + Number(d) ** 2, 0);
  }
  return n === 1;
}

// ---- p141_trailingZerosFactorial
function p141_trailingZerosFactorial(n: number): number {
  let count = 0;
  while (n) {
    n = Math.floor(n / 5);
    count += n;
  }
  return count;
}

// ---- p142_integerSqrt
function p142_integerSqrt(n: number): number {
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (mid * mid <= n) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// ---- p143_fizzbuzz
function p143_fizzbuzz(n: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    out.push(i % 15 === 0 ? "FizzBuzz" : i % 3 === 0 ? "Fizz" : i % 5 === 0 ? "Buzz" : String(i));
  }
  return out;
}

// ---- p144_swapWithoutTemp
function p144_swapWithoutTemp(a: number, b: number): [number, number] {
  [a, b] = [b, a];
  return [a, b];
}

// ---- p145_collatzSteps
function p145_collatzSteps(n: number): number {
  let steps = 0;
  while (n !== 1) {
    n = n % 2 === 0 ? n / 2 : 3 * n + 1;
    steps++;
  }
  return steps;
}

// ---- p146_nthPrime
function p146_nthPrime(n: number): number {
  let count = 0;
  let num = 1;
  while (count < n) {
    num++;
    if (p121_isPrime(num)) count++;
  }
  return num;
}

// ---- p147_pascalRow
function p147_pascalRow(n: number): number[] {
  const row = [1];
  for (let k = 0; k < n; k++) row.push((row[k] * (n - k)) / (k + 1));
  return row;
}

// ---- p148_ncr
function p148_ncr(n: number, r: number): number {
  r = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= r; i++) result = (result * (n - r + i)) / i;
  return result;
}

// ---- p149_isStrongNumber
function p149_isStrongNumber(n: number): boolean {
  const fact = (d: number): number => (d <= 1 ? 1 : d * fact(d - 1));
  return [...String(n)].reduce((sum, d) => sum + fact(Number(d)), 0) === n;
}

// ---- p150_numberToWords
function p150_numberToWords(n: number): string {
  const ones = ("zero one two three four five six seven eight nine ten eleven twelve thirteen " +
    "fourteen fifteen sixteen seventeen eighteen nineteen").split(" ");
  const tens = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split(" ");
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? "-" + ones[n % 10] : "");
  const rest = n % 100;
  return ones[Math.floor(n / 100)] + " hundred" + (rest ? " " + p150_numberToWords(rest) : "");
}

// ---- p151_isUglyNumber
function p151_isUglyNumber(n: number): boolean {
  if (n <= 0) return false;
  for (const p of [2, 3, 5]) while (n % p === 0) n /= p;
  return n === 1;
}

// ---- p152_sumNatural
function p152_sumNatural(n: number): number {
  return (n * (n + 1)) / 2;
}

// ---- p153_factors
function p153_factors(n: number): number[] {
  const out = new Set<number>();
  for (let d = 1; d * d <= n; d++) {
    if (n % d === 0) {
      out.add(d);
      out.add(n / d);
    }
  }
  return [...out].sort((a, b) => a - b);
}

// ---- p154_isPerfectSquare
function p154_isPerfectSquare(n: number): boolean {
  return n >= 0 && Math.floor(Math.sqrt(n)) ** 2 === n;
}

// ---- p155_toBase
function p155_toBase(n: number, base: number): string {
  const digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (n === 0) return "0";
  let out = "";
  while (n) {
    out = digits[n % base] + out;
    n = Math.floor(n / base);
  }
  return out;
}

// ---- p156_maxDigit
function p156_maxDigit(n: number): number {
  return Math.max(...[...String(Math.abs(n))].map(Number));
}

// ---- p157_countDigits
function p157_countDigits(n: number): number {
  return String(Math.abs(n)).length;
}

// ---- p158_singleNumber
function p158_singleNumber(nums: number[]): number {
  return nums.reduce((acc, n) => acc ^ n, 0);
}

// ---- p159_splitEvenOdd
function p159_splitEvenOdd(nums: number[]): [number[], number[]] {
  return [nums.filter((n) => n % 2 === 0), nums.filter((n) => n % 2 !== 0)];
}

// ---- p160_isLeapYear
function p160_isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
