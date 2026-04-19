"""Scanner registry — auto-discovers all BaseScanner subclasses."""

from .base import BaseScanner

# Import definitions to trigger class creation
from . import definitions as _  # noqa: F401


def _all_subclasses(cls):
    """Recursively find all subclasses."""
    result = []
    for sub in cls.__subclasses__():
        if hasattr(sub, 'id') and not sub.__name__.startswith('Base'):
            result.append(sub)
        result.extend(_all_subclasses(sub))
    return result


def _discover_scanners() -> dict[str, BaseScanner]:
    registry: dict[str, BaseScanner] = {}
    for cls in _all_subclasses(BaseScanner):
        instance = cls()
        registry[instance.id] = instance
    return registry


SCANNER_REGISTRY: dict[str, BaseScanner] = _discover_scanners()


def get_scanner(scanner_id: str) -> BaseScanner | None:
    return SCANNER_REGISTRY.get(scanner_id)


def get_all_scanners() -> list[BaseScanner]:
    return list(SCANNER_REGISTRY.values())
