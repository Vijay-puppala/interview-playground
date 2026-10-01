"""Number / math programs (p121-p160). Docstring = title, blank line, explanation."""
from math import isqrt

from ._registry import case


@case(2, expect=True)
@case(17, expect=True)
@case(1, expect=False)
@case(21, expect=False)
@case(0, expect=False)
def p121_is_prime(n):
    """Check if a number is prime

    Only test divisors up to sqrt(n); if none divides n it is prime. O(sqrt n).
    """
    if n < 2:
        return False
    return all(n % d for d in range(2, isqrt(n) + 1))


@case(30, expect=[2, 3, 5, 7, 11, 13, 17, 19, 23, 29])
def p122_primes_up_to(n):
    """All primes up to n (Sieve of Eratosthenes)

    Cross out multiples of each prime starting from p*p. O(n log log n).
    """
    if n < 2:
        return []
    sieve = [True] * (n + 1)
    sieve[0] = sieve[1] = False
    for p in range(2, isqrt(n) + 1):
        if sieve[p]:
            sieve[p * p::p] = [False] * len(sieve[p * p::p])
    return [i for i, ok in enumerate(sieve) if ok]


@case(5, expect=120)
@case(0, expect=1)
@case(-1, raises=ValueError)
def p123_factorial(n):
    """Factorial

    Multiply 1..n; reject negatives. Recursion is fine for small n, a loop
    avoids the recursion limit.
    """
    if n < 0:
        raise ValueError("factorial is undefined for negative numbers")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result


@case(10, expect=55)
@case(0, expect=0)
@case(1, expect=1)
def p124_fibonacci(n):
    """nth Fibonacci number

    Iterate keeping the last two values. O(n) time, O(1) space (naive
    recursion is O(2^n), a classic follow-up).
    """
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


@case(7, expect=[0, 1, 1, 2, 3, 5, 8])
def p125_fibonacci_series(n):
    """First n Fibonacci numbers

    Build the list while updating the pair (a, b).
    """
    out, a, b = [], 0, 1
    for _ in range(n):
        out.append(a)
        a, b = b, a + b
    return out


@case(48, 18, expect=6)
@case(0, 5, expect=5)
def p126_gcd(a, b):
    """Greatest common divisor (Euclid)

    gcd(a, b) = gcd(b, a mod b) until b is 0. O(log min(a, b)).
    """
    while b:
        a, b = b, a % b
    return a


@case(4, 6, expect=12)
def p127_lcm(a, b):
    """Least common multiple

    lcm = a * b / gcd(a, b).
    """
    return a * b // p126_gcd(a, b)


@case(153, expect=True)
@case(9474, expect=True)
@case(123, expect=False)
def p128_is_armstrong(n):
    """Armstrong number

    Sum of each digit raised to the number of digits equals the number.
    """
    digits = str(n)
    return sum(int(d) ** len(digits) for d in digits) == n


@case(28, expect=True)
@case(6, expect=True)
@case(12, expect=False)
@case(1, expect=False)
def p129_is_perfect_number(n):
    """Perfect number

    Equals the sum of its proper divisors (6 = 1+2+3).
    """
    return n > 1 and sum(d for d in range(1, n // 2 + 1) if n % d == 0) == n


@case(1234, expect=4321)
@case(-120, expect=-21)
def p130_reverse_number(n):
    """Reverse the digits of an integer

    Reverse the digit string and restore the sign.
    """
    r = int(str(abs(n))[::-1])
    return -r if n < 0 else r


@case(121, expect=True)
@case(-121, expect=False)
@case(10, expect=False)
def p131_is_palindrome_number(n):
    """Palindrome number

    Negative numbers are not palindromes; compare digits with the reverse.
    """
    return n >= 0 and str(n) == str(n)[::-1]


@case(9875, expect=29)
def p132_sum_of_digits(n):
    """Sum of digits

    Peel digits with divmod(n, 10). O(log n).
    """
    n, total = abs(n), 0
    while n:
        n, d = divmod(n, 10)
        total += d
    return total


@case(493193, expect=2)
def p133_digital_root(n):
    """Digital root

    Repeatedly sum digits until one digit remains (or use 1 + (n-1) % 9).
    """
    return 0 if n == 0 else 1 + (n - 1) % 9


@case(2, 10, expect=1024)
@case(2, -2, expect=0.25)
@case(5, 0, expect=1)
def p134_fast_power(base, exp):
    """Fast exponentiation (square and multiply)

    Halve the exponent each step: x^n = (x^2)^(n/2). O(log n).
    """
    if exp < 0:
        return 1 / p134_fast_power(base, -exp)
    result = 1
    while exp:
        if exp & 1:
            result *= base
        base *= base
        exp >>= 1
    return result


@case(16, expect=True)
@case(18, expect=False)
@case(0, expect=False)
@case(1, expect=True)
def p135_is_power_of_two(n):
    """Is the number a power of two?

    A power of two has exactly one set bit, so n & (n-1) clears it to 0.
    """
    return n > 0 and n & (n - 1) == 0


@case(13, expect=3)
@case(0, expect=0)
def p136_count_set_bits(n):
    """Count set bits (population count)

    Brian Kernighan: n & (n-1) removes the lowest set bit, so loop count =
    number of ones.
    """
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count


@case(10, expect="1010")
@case(0, expect="0")
def p137_decimal_to_binary(n):
    """Decimal to binary string

    Repeatedly divide by 2 collecting remainders (or bin(n)[2:]).
    """
    if n == 0:
        return "0"
    bits = []
    while n:
        n, r = divmod(n, 2)
        bits.append(str(r))
    return "".join(reversed(bits))


@case("1010", expect=10)
def p138_binary_to_decimal(s):
    """Binary string to decimal

    Shift the accumulator left and add each bit (or int(s, 2)).
    """
    n = 0
    for bit in s:
        n = n * 2 + int(bit)
    return n


@case(84, expect=[2, 2, 3, 7])
@case(13, expect=[13])
def p139_prime_factors(n):
    """Prime factorisation

    Divide out each factor d while d*d <= n; what remains is prime.
    """
    out, d = [], 2
    while d * d <= n:
        while n % d == 0:
            out.append(d)
            n //= d
        d += 1
    if n > 1:
        out.append(n)
    return out


@case(19, expect=True)
@case(2, expect=False)
def p140_is_happy_number(n):
    """Happy number

    Replace n by the sum of squares of its digits; it is happy if it reaches
    1, otherwise it cycles (detect with a set).
    """
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = sum(int(d) ** 2 for d in str(n))
    return n == 1


@case(100, expect=24)
@case(5, expect=1)
def p141_trailing_zeros_factorial(n):
    """Trailing zeros of n!

    Each zero needs a factor 5 (2s are plentiful): n/5 + n/25 + n/125 ...
    """
    count = 0
    while n:
        n //= 5
        count += n
    return count


@case(17, expect=4)
@case(16, expect=4)
@case(0, expect=0)
def p142_integer_sqrt(n):
    """Integer square root without math.sqrt

    Binary search for the largest x with x*x <= n. O(log n).
    """
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if mid * mid <= n:
            lo = mid
        else:
            hi = mid - 1
    return lo


@case(5, expect=["1", "2", "Fizz", "4", "Buzz"])
@case(15, expect=["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11",
                  "Fizz", "13", "14", "FizzBuzz"])
def p143_fizzbuzz(n):
    """FizzBuzz

    Check divisibility by 15 first, then 3 and 5.
    """
    out = []
    for i in range(1, n + 1):
        out.append("FizzBuzz" if i % 15 == 0 else "Fizz" if i % 3 == 0 else "Buzz" if i % 5 == 0 else str(i))
    return out


@case(3, 7, expect=(7, 3))
def p144_swap_without_temp(a, b):
    """Swap two numbers without a temp variable

    Python tuple unpacking; in other languages use XOR or arithmetic.
    """
    a, b = b, a
    return a, b


@case(6, expect=8)
@case(1, expect=0)
def p145_collatz_steps(n):
    """Collatz steps to reach 1

    Even: n/2, odd: 3n+1. Count steps until n == 1.
    """
    steps = 0
    while n != 1:
        n = n // 2 if n % 2 == 0 else 3 * n + 1
        steps += 1
    return steps


@case(10, expect=29)
@case(1, expect=2)
def p146_nth_prime(n):
    """nth prime number

    Test candidates upward until n primes are found.
    """
    count, num = 0, 1
    while count < n:
        num += 1
        if p121_is_prime(num):
            count += 1
    return num


@case(4, expect=[1, 4, 6, 4, 1])
def p147_pascal_row(n):
    """nth row of Pascal's triangle

    Each element is C(n, k); build it from the previous one using
    C(n, k+1) = C(n, k) * (n-k) / (k+1).
    """
    row = [1]
    for k in range(n):
        row.append(row[-1] * (n - k) // (k + 1))
    return row


@case(5, 2, expect=10)
@case(5, 0, expect=1)
def p148_ncr(n, r):
    """nCr combinations

    Multiplicative formula avoids huge factorials. Equivalent to math.comb.
    """
    r = min(r, n - r)
    result = 1
    for i in range(1, r + 1):
        result = result * (n - r + i) // i
    return result


@case(145, expect=True)
@case(123, expect=False)
def p149_is_strong_number(n):
    """Strong number

    Sum of the factorials of the digits equals the number (145 = 1!+4!+5!).
    """
    from math import factorial
    return sum(factorial(int(d)) for d in str(n)) == n


@case(342, expect="three hundred forty-two")
@case(0, expect="zero")
@case(19, expect="nineteen")
@case(100, expect="one hundred")
def p150_number_to_words(n):
    """Number to English words (0-999)

    Handle the hundreds digit, then the teens, then tens and ones.
    """
    ones = ("zero one two three four five six seven eight nine ten eleven twelve thirteen "
            "fourteen fifteen sixteen seventeen eighteen nineteen").split()
    tens = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
    if n < 20:
        return ones[n]
    if n < 100:
        return tens[n // 10] + ("-" + ones[n % 10] if n % 10 else "")
    rest = n % 100
    return ones[n // 100] + " hundred" + (" " + p150_number_to_words(rest) if rest else "")


@case(6, expect=True)
@case(14, expect=False)
@case(1, expect=True)
def p151_is_ugly_number(n):
    """Ugly number (only prime factors 2, 3, 5)

    Divide out 2, 3 and 5; the result must be 1.
    """
    if n <= 0:
        return False
    for p in (2, 3, 5):
        while n % p == 0:
            n //= p
    return n == 1


@case(100, expect=5050)
def p152_sum_natural(n):
    """Sum of the first n natural numbers

    Gauss: n(n+1)/2, O(1) instead of a loop.
    """
    return n * (n + 1) // 2


@case(36, expect=[1, 2, 3, 4, 6, 9, 12, 18, 36])
def p153_factors(n):
    """All factors of a number

    Pair each divisor d <= sqrt(n) with n // d. O(sqrt n).
    """
    small = [d for d in range(1, isqrt(n) + 1) if n % d == 0]
    return sorted(set(small + [n // d for d in small]))


@case(16, expect=True)
@case(14, expect=False)
@case(0, expect=True)
def p154_is_perfect_square(n):
    """Perfect square check

    isqrt(n) squared must give n; avoids float rounding issues.
    """
    return n >= 0 and isqrt(n) ** 2 == n


@case(255, 16, expect="FF")
@case(10, 2, expect="1010")
@case(0, 8, expect="0")
def p155_to_base(n, base):
    """Convert a number to any base (2-36)

    Repeatedly divmod by the base and map remainders to digits.
    """
    digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if n == 0:
        return "0"
    out = []
    while n:
        n, r = divmod(n, base)
        out.append(digits[r])
    return "".join(reversed(out))


@case(94152, expect=9)
def p156_max_digit(n):
    """Largest digit in a number

    Convert to string and take the max digit.
    """
    return max(int(d) for d in str(abs(n)))


@case(12345, expect=5)
@case(0, expect=1)
def p157_count_digits(n):
    """Count the digits of a number

    len(str(abs(n))); avoids log10 rounding errors.
    """
    return len(str(abs(n)))


@case([4, 1, 2, 1, 2], expect=4)
def p158_single_number(nums):
    """Single number (everything else appears twice)

    XOR cancels equal pairs: a ^ a = 0 and a ^ 0 = a. O(n), O(1).
    """
    result = 0
    for n in nums:
        result ^= n
    return result


@case([1, 2, 3, 4, 5, 6], expect=([2, 4, 6], [1, 3, 5]))
def p159_split_even_odd(nums):
    """Split numbers into evens and odds

    Two comprehensions with n % 2.
    """
    return [n for n in nums if n % 2 == 0], [n for n in nums if n % 2]


@case(2000, expect=True)
@case(1900, expect=False)
@case(2024, expect=True)
@case(2023, expect=False)
def p160_is_leap_year(year):
    """Leap year

    Divisible by 4, except centuries unless divisible by 400.
    """
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
