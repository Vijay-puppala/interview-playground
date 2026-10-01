"""Export every program's @case examples to JSON so JS/TS can run the same checks."""
import inspect
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from playground._registry import MISSING, discover  # noqa: E402


def to_json(v):
    if isinstance(v, type):
        return v.__name__
    if isinstance(v, (tuple, list)):
        return [to_json(x) for x in v]
    if isinstance(v, dict):
        return {str(k): to_json(x) for k, x in v.items()}
    if isinstance(v, (set, frozenset)):
        return sorted(to_json(x) for x in v)
    return v


def export():
    out = {}
    for p in discover():
        if not p.cases or inspect.isclass(p.obj):
            continue
        params = list(inspect.signature(p.obj).parameters)
        rows = []
        for c in p.cases:
            args = list(c.args)
            for name in params[len(args):]:
                if name in c.kwargs:
                    args.append(c.kwargs[name])
                else:
                    break
            row = {"args": to_json(args)}
            if c.raises:
                row["raises"] = True
            elif c.expect is not MISSING:
                row["expect"] = to_json(c.expect)
            rows.append(row)
        out[p.name] = rows
    return out


if __name__ == "__main__":
    dest = Path(__file__).resolve().parent.parent / "build" / "cases.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(export()))
    print("wrote", dest)
