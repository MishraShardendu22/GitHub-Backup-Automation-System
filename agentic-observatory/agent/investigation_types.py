from enum import Enum

class InvestigationType(str, Enum):
    BACKUP = "backup"
    FAILURE = "failure"
    METRICS = "metrics"
    SUMMARY = "summary"
    ANALYTICS = "analytics"
    REPOSITORY = "repository"