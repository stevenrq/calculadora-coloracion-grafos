import type { Graph, VertexId } from '@/lib/graph/types';
import { criticalPath, missingDurations, type Schedule } from './critical-path';
import { toActivities } from './model';
import { computeStages, type StageAnalysis } from './stages';
import type { Activity, ActivityInfoMap, PrecedenceIssue } from './types';
import { validateActivities } from './validate';

export type PrecedenceAnalysis =
  | { valid: false; activities: Activity[]; issues: PrecedenceIssue[] }
  | { valid: true; activities: Activity[]; stages: StageAnalysis; schedule: Schedule | null; missing: VertexId[] };

/** Todo lo que muestra el módulo. Es barato (lineal en actividades y flechas): se calcula en cada render. */
export function analyzePrecedence(g: Graph, info?: ActivityInfoMap): PrecedenceAnalysis {
  const activities = toActivities(g, info);
  const issues = validateActivities(activities);
  if (issues.length > 0) return { valid: false, activities, issues };
  const stages = computeStages(activities);
  const missing = missingDurations(activities);
  return { valid: true, activities, stages, schedule: criticalPath(activities, stages.order), missing };
}
