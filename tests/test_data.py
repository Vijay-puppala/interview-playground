"""PySpark programs need a SparkSession, so they are tested here (skipped if pyspark is missing)."""
import pytest

pytest.importorskip("pyspark")

from playground import data  # noqa: E402


@pytest.fixture(scope="module")
def spark():
    from pyspark.sql import SparkSession
    s = (SparkSession.builder.master("local[1]").appName("playground-tests")
         .config("spark.ui.enabled", "false").config("spark.sql.shuffle.partitions", "1").getOrCreate())
    s.sparkContext.setLogLevel("ERROR")
    yield s
    s.stop()


def test_p321_dedupe(spark):
    assert data.p321_spark_dedupe(spark, [(1, "a"), (1, "a"), (2, "b")], ["id", "v"]) == [(1, "a"), (2, "b")]


def test_p322_groupby_agg(spark):
    rows = [("qa", 10), ("qa", 20), ("dev", 30)]
    assert data.p322_spark_groupby_agg(spark, rows) == [("dev", 30.0, 1), ("qa", 15.0, 2)]


def test_p323_filter_select(spark):
    assert data.p323_spark_filter_select(spark, [("a", 17), ("b", 30), ("c", 18)], 18) == ["b", "c"]


def test_p324_join(spark):
    assert data.p324_spark_join(spark, [(1, "a"), (2, "b")], [(1, "X")]) == [(1, "a", "X")]


def test_p325_top_per_group(spark):
    rows = [("qa", "amy", 10), ("qa", "bo", 20), ("dev", "cy", 5)]
    assert data.p325_spark_top_per_group(spark, rows) == [("dev", "cy", 5), ("qa", "bo", 20)]


def test_p326_null_report(spark):
    assert data.p326_spark_null_report(spark, [(1, None), (None, "x")], ["a", "b"]) == {"a": 1, "b": 1}


def test_p327_word_count(spark):
    assert data.p327_spark_word_count(spark, ["a b a", "B c"]) == {"a": 2, "b": 2, "c": 1}


def test_p328_grade_with_when(spark):
    out = data.p328_spark_grade_with_when(spark, [("x", 95), ("y", 80), ("z", 10)])
    assert out == [("x", 95, "A"), ("y", 80, "B"), ("z", 10, "C")]


def test_p329_diff_frames(spark):
    out = data.p329_spark_diff_frames(spark, [(1, "a"), (2, "b")], [(1, "a"), (3, "c")], ["id", "v"])
    assert out == {"missing": [(2, "b")], "unexpected": [(3, "c")]}


def test_p330_sql_query(spark):
    assert data.p330_spark_sql_query(spark, [("a", 17), ("b", 30)]) == [1]
