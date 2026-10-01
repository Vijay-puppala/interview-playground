"""Data validation with pandas (p301-p320) and PySpark (p321-p330).

pandas programs take/return plain records (list of dicts) so examples stay JSON-friendly.
PySpark programs take a SparkSession first; they are tested in tests/test_data.py.
"""
import io

import pandas as pd

from ._registry import case


def _df(records):
    return pd.DataFrame(records)


# ---------------------------------------------------------------- pandas ----
@case([{"a": 1, "b": None}, {"a": None, "b": None}], expect={"a": 1, "b": 2})
def p301_count_nulls_per_column(records):
    """Count missing values per column

    isna().sum() is the first data-quality check in any ETL test.
    """
    return {c: int(n) for c, n in _df(records).isna().sum().items()}


@case([{"id": 1, "n": "a"}, {"id": 1, "n": "a"}, {"id": 2, "n": "b"}],
      expect=[{"id": 1, "n": "a"}, {"id": 2, "n": "b"}])
def p302_drop_duplicate_rows(records):
    """Remove duplicate rows

    drop_duplicates keeps the first occurrence; pass subset=[...] to dedupe
    on a business key.
    """
    return _df(records).drop_duplicates().to_dict("records")


@case([{"x": 1.0}, {"x": None}, {"x": 3.0}], "x", expect=[1.0, 2.0, 3.0])
def p303_fill_missing_with_mean(records, col):
    """Fill missing values with the column mean

    fillna(mean) imputes gaps; NaNs are skipped when computing the mean.
    """
    df = _df(records)
    return df[col].fillna(df[col].mean()).tolist()


@case([{"team": "a", "pts": 1}, {"team": "b", "pts": 5}, {"team": "a", "pts": 3}], "team", "pts",
      expect={"a": 4, "b": 5})
def p304_groupby_sum(records, by, col):
    """Group by a column and sum

    groupby(...)[col].sum() is the pandas twin of SQL GROUP BY + SUM.
    """
    return {k: int(v) for k, v in _df(records).groupby(by)[col].sum().items()}


@case([{"n": "a", "age": 17}, {"n": "b", "age": 30}], "age", 18, expect=[{"n": "b", "age": 30}])
def p305_filter_rows(records, col, minimum):
    """Filter rows with a boolean mask

    df[df[col] >= x] keeps matching rows (index is preserved, hence reset_index).
    """
    df = _df(records)
    return df[df[col] >= minimum].reset_index(drop=True).to_dict("records")


@case([{"n": "a", "s": 1}, {"n": "b", "s": 9}, {"n": "c", "s": 5}], "s", 2,
      expect=[{"n": "b", "s": 9}, {"n": "c", "s": 5}])
def p306_top_n_by_column(records, col, n):
    """Top N rows by a column

    sort_values(descending) then head(n); nlargest is the shortcut.
    """
    return _df(records).sort_values(col, ascending=False).head(n).reset_index(drop=True).to_dict("records")


@case([{"id": 1, "name": "a"}, {"id": 2, "name": "b"}], [{"id": 1, "city": "X"}], "id",
      expect=[{"id": 1, "name": "a", "city": "X"}])
def p307_merge_tables(left, right, on):
    """Inner join two tables

    pd.merge(how='inner') keeps only keys present on both sides; use
    how='left' plus indicator=True to find orphans in data tests.
    """
    return _df(left).merge(_df(right), on=on, how="inner").to_dict("records")


@case([{"day": "Mon", "t": "a", "v": 1}, {"day": "Mon", "t": "b", "v": 2}, {"day": "Tue", "t": "a", "v": 3}],
      "day", "t", "v", expect={"a": {"Mon": 1, "Tue": 3}, "b": {"Mon": 2, "Tue": 0}})
def p308_pivot_table(records, index, columns, values):
    """Pivot table

    Reshape long data into a matrix; fill_value replaces missing combinations.
    """
    pt = _df(records).pivot_table(index=index, columns=columns, values=values, aggfunc="sum", fill_value=0)
    return {c: {i: int(v) for i, v in col.items()} for c, col in pt.to_dict().items()}


@case([{"s": "pass"}, {"s": "fail"}, {"s": "pass"}], "s", expect={"pass": 2, "fail": 1})
def p309_value_counts(records, col):
    """Count occurrences of each value

    value_counts() is perfect for result summaries (pass/fail/skip).
    """
    return {k: int(v) for k, v in _df(records)[col].value_counts().items()}


@case([{"price": 2.5, "qty": 4}, {"price": 1.0, "qty": 3}],
      expect=[{"price": 2.5, "qty": 4, "total": 10.0}, {"price": 1.0, "qty": 3, "total": 3.0}])
def p310_add_total_column(records):
    """Add a derived column

    Vectorised arithmetic between columns beats looping over rows.
    """
    df = _df(records)
    df["total"] = df["price"] * df["qty"]
    return df.to_dict("records")


@case([{"id": 1, "nm": "a", "x": 0}], {"id": "user_id", "nm": "name"}, expect=[{"user_id": 1, "name": "a"}])
def p311_rename_and_select(records, mapping):
    """Rename columns and keep only some

    rename(columns=...) then select the new names, a common contract-mapping step.
    """
    return _df(records).rename(columns=mapping)[list(mapping.values())].to_dict("records")


@case([1, 2, 3, 4, 100], expect=[100])
def p312_find_outliers_iqr(values):
    """Detect outliers with the IQR rule

    Anything below Q1 - 1.5*IQR or above Q3 + 1.5*IQR is an outlier.
    """
    s = pd.Series(values)
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    return s[(s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)].tolist()


@case([10, 20, 30], expect=[0.0, 0.5, 1.0])
def p313_min_max_normalize(values):
    """Min-max normalise to the range 0-1

    (x - min) / (max - min), used before comparing metrics on one scale.
    """
    s = pd.Series(values)
    return ((s - s.min()) / (s.max() - s.min())).tolist()


@case(["2024-01-15", "2024-03-02"], expect=[1, 3])
def p314_extract_months(dates):
    """Parse dates and extract the month

    to_datetime plus the .dt accessor; errors='coerce' turns bad dates into NaT.
    """
    return pd.to_datetime(pd.Series(dates)).dt.month.tolist()


@case([{"a": 1, "b": 2}, {"a": 3, "b": 4}], [{"a": 1, "b": 2}, {"a": 3, "b": 9}], expect=[(1, "b")])
def p315_diff_dataframes(expected, actual):
    """Cell-level diff of expected vs actual data

    Returns the (row, column) of every mismatch: the heart of data migration
    testing. (pandas.testing.assert_frame_equal is the pytest-friendly version.)
    """
    e, a = _df(expected), _df(actual)
    return [(i, c) for c in e.columns for i in range(len(e)) if e.at[i, c] != a.at[i, c]]


@case([{"id": 1, "name": "a"}], {"id": "int", "name": "str"}, expect=[])
@case([{"id": "x", "name": "a"}], {"id": "int", "name": "str"}, expect=["id: expected int"])
def p316_validate_dtypes(records, expected):
    """Validate column types

    Assert dtypes before trusting the data; type drift is a classic upstream bug.
    """
    df, errors = _df(records), []
    checks = {"int": pd.api.types.is_integer_dtype, "float": pd.api.types.is_float_dtype,
              "str": pd.api.types.is_string_dtype}
    for col, kind in expected.items():
        if col not in df or not checks[kind](df[col]):
            errors.append(f"{col}: expected {kind}")
    return errors


@case([{"id": 1}, {"id": 2}, {"id": 2}, {"id": 3}, {"id": 3}, {"id": 3}], "id", expect=[2, 3])
def p317_find_duplicate_keys(records, key):
    """Find duplicated primary keys

    duplicated() flags repeats; uniqueness of keys is a basic table test.
    """
    s = _df(records)[key]
    return sorted(s[s.duplicated()].unique().tolist())


@case([1, 2, 3, 4, 5], 3, expect=[2.0, 3.0, 4.0])
def p318_rolling_average(values, window):
    """Moving average

    rolling(window).mean() leaves NaN for the first window-1 rows; dropna removes them.
    """
    return pd.Series(values).rolling(window).mean().dropna().tolist()


@case([{"name": "  aLice "}, {"name": "BOB"}], "name", expect=["Alice", "Bob"])
def p319_clean_text_column(records, col):
    """Clean a text column

    Chain the .str accessor: strip whitespace then Title Case.
    """
    return _df(records)[col].str.strip().str.title().tolist()


@case("city,sales\nA,10\nB,5\nA,7", "city", "sales", expect={"A": 17, "B": 5})
def p320_csv_group_total(csv_text, by, col):
    """Read CSV text and total by group

    read_csv accepts any file-like object, so StringIO makes tests self-contained.
    """
    df = pd.read_csv(io.StringIO(csv_text))
    return {k: int(v) for k, v in df.groupby(by)[col].sum().items()}


# --------------------------------------------------------------- PySpark ----
def p321_spark_dedupe(spark, rows, cols):
    """PySpark: drop duplicate rows

    dropDuplicates() (optionally on a subset of columns) is distributed, so
    the same call scales from a unit test to billions of rows.
    """
    df = spark.createDataFrame(rows, cols).dropDuplicates()
    return sorted(tuple(r) for r in df.collect())


def p322_spark_groupby_agg(spark, rows):
    """PySpark: group by with several aggregates

    groupBy().agg() computes avg and count per department in one pass.
    """
    from pyspark.sql import functions as F
    df = spark.createDataFrame(rows, ["dept", "salary"])
    out = df.groupBy("dept").agg(F.avg("salary").alias("avg"), F.count("*").alias("n"))
    return sorted((r["dept"], float(r["avg"]), r["n"]) for r in out.collect())


def p323_spark_filter_select(spark, rows, min_age):
    """PySpark: filter rows and select columns

    filter() and select() are lazy transformations; collect() triggers execution.
    """
    from pyspark.sql import functions as F
    df = spark.createDataFrame(rows, ["name", "age"])
    return sorted(r["name"] for r in df.filter(F.col("age") >= min_age).select("name").collect())


def p324_spark_join(spark, left, right):
    """PySpark: inner join two DataFrames

    join(on='id') matches keys; choose how='left_anti' to list unmatched rows.
    """
    l = spark.createDataFrame(left, ["id", "name"])
    r = spark.createDataFrame(right, ["id", "city"])
    return sorted(tuple(x) for x in l.join(r, "id", "inner").collect())


def p325_spark_top_per_group(spark, rows):
    """PySpark: top earner per department (window function)

    row_number() over a window partitioned by dept and ordered by salary desc;
    keep rank 1. A classic interview question.
    """
    from pyspark.sql import Window
    from pyspark.sql import functions as F
    df = spark.createDataFrame(rows, ["dept", "name", "salary"])
    w = Window.partitionBy("dept").orderBy(F.col("salary").desc())
    top = df.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn")
    return sorted(tuple(r) for r in top.collect())


def p326_spark_null_report(spark, rows, cols):
    """PySpark: count nulls in every column

    Aggregate sum(when(col.isNull(), 1)) for each column in a single job.
    Gotcha: Spark cannot infer a type for an all-None column, so pass an
    explicit schema when test data may be entirely null.
    """
    from pyspark.sql import functions as F
    df = spark.createDataFrame(rows, cols)
    agg = df.agg(*[F.sum(F.when(F.col(c).isNull(), 1).otherwise(0)).alias(c) for c in cols]).first()
    return {c: int(agg[c]) for c in cols}


def p327_spark_word_count(spark, lines):
    """PySpark: word count

    split -> explode -> groupBy -> count: the 'hello world' of big data.
    """
    from pyspark.sql import functions as F
    df = spark.createDataFrame([(l,) for l in lines], ["line"])
    words = df.select(F.explode(F.split(F.lower("line"), r"\s+")).alias("word"))
    return {r["word"]: r["count"] for r in words.groupBy("word").count().collect()}


def p328_spark_grade_with_when(spark, rows):
    """PySpark: derive a column with when/otherwise

    Conditional logic in Spark uses when().otherwise(), the SQL CASE WHEN equivalent.
    """
    from pyspark.sql import functions as F
    df = spark.createDataFrame(rows, ["name", "score"])
    out = df.withColumn("grade", F.when(F.col("score") >= 90, "A").when(F.col("score") >= 75, "B").otherwise("C"))
    return sorted(tuple(r) for r in out.collect())


def p329_spark_diff_frames(spark, expected, actual, cols):
    """PySpark: compare expected and actual DataFrames

    exceptAll in both directions lists missing and unexpected rows
    (duplicate-aware), ideal for ETL output validation.
    """
    e, a = spark.createDataFrame(expected, cols), spark.createDataFrame(actual, cols)
    return {"missing": sorted(tuple(r) for r in e.exceptAll(a).collect()),
            "unexpected": sorted(tuple(r) for r in a.exceptAll(e).collect())}


def p330_spark_sql_query(spark, rows):
    """PySpark: query a DataFrame with SQL

    Register a temp view and use spark.sql, handy when test authors prefer SQL.
    """
    spark.createDataFrame(rows, ["name", "age"]).createOrReplaceTempView("people")
    return [r["n"] for r in spark.sql("SELECT COUNT(*) AS n FROM people WHERE age >= 18").collect()]
