import React, { useEffect, useMemo, useState } from 'react';
import { Check, Flame, Plus, Scale, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import {
  aggregateDailyCalories,
  aggregateDailyProtein,
  aggregateWeightSeries,
  computeWeeklyWeightTrend,
} from '../domain/ProgressAggregator';
import { calculateBmi } from '../domain/BmiCalculator';
import { toDisplayWeight, fromDisplayWeight, formatWeight } from '../domain/WeightConverter';
import { LineChart, LineChartDatum } from '../components/LineChart';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { PressScale } from '../components/PressScale';

export const ProgressScreen: React.FC<{ onEditProfile: () => void }> = ({ onEditProfile }) => {
  const {
    profile,
    settings,
    meals,
    weights,
    latestWeightKg,
    macroTargets,
    logWeight,
    weeklyWeightTrend,
  } = useFitLife();

  const unit = settings.weightUnit;

  const hasWeight = weights.length > 0 || profile.onboarded;
  const [weightInput, setWeightInput] = useState<string>(() =>
    hasWeight ? String(toDisplayWeight(latestWeightKg, unit)) : ''
  );

  useEffect(() => {
    setWeightInput(hasWeight ? String(toDisplayWeight(latestWeightKg, unit)) : '');
  }, [latestWeightKg, unit, hasWeight]);

  const bmiResult = useMemo(
    () => calculateBmi(latestWeightKg, profile.heightCm, profile.age),
    [latestWeightKg, profile.heightCm, profile.age]
  );

  const sortedWeights = useMemo(
    () => [...weights].sort((a, b) => a.timestamp - b.timestamp),
    [weights]
  );
  const firstWeight = sortedWeights.length > 0 ? sortedWeights[0] : null;
  const latestWeightEntry = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1] : null;
  const deltaKg =
    firstWeight && latestWeightEntry && firstWeight.dateKey !== latestWeightEntry.dateKey
      ? latestWeightEntry.weightKg - firstWeight.weightKg
      : 0;
  const deltaDisplay = toDisplayWeight(Math.abs(deltaKg), unit);

  const weightChartData: LineChartDatum[] = useMemo(() => {
    const pts = aggregateWeightSeries(weights, unit, 14);
    return pts.map((p) => ({
      dateKey: p.dateKey,
      label: p.label,
      value: p.calories,
      sublabel: p.dateKey,
    }));
  }, [weights, unit]);

  const calorieChartData: LineChartDatum[] = useMemo(() => {
    const pts = aggregateDailyCalories(meals, 14);
    return pts.map((p) => ({
      dateKey: p.dateKey,
      label: p.label,
      value: p.calories ?? null,
      sublabel: p.label,
    }));
  }, [meals]);

  const proteinChartData: LineChartDatum[] = useMemo(() => {
    const pts = aggregateDailyProtein(meals, 14);
    return pts.map((p) => ({
      dateKey: p.dateKey,
      label: p.label,
      value: p.calories ?? null,
      sublabel: p.label,
    }));
  }, [meals]);

  const handleLogWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(weightInput);
    if (!Number.isFinite(num) || num <= 0) return;
    const kg = fromDisplayWeight(num, unit);
    if (kg >= 25 && kg <= 260) {
      logWeight(kg);
    }
  };

  const bmiMarkerPct = Math.max(0, Math.min(100, ((bmiResult.bmi - 15) / 20) * 100));

  return (
    <div className="space-y-4 px-4 pb-28 pt-2 animate-screen-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[#F4F1EA]">Progress & Trends</h1>
          <p className="text-xs text-[#84877F]">
            Weight check-ins and 14 days of food logs
          </p>
        </div>
        <span className="rounded-full border border-[#3E634B] bg-[#213026] px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-[#7BB38F]">
          {unit.toUpperCase()} Display
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[26px] border border-[#3E634B] bg-[#213026] p-5 shadow-xl" data-guide-target="progress-weight" aria-label="Weight check-in">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-wider text-[#7BB38F]">
              <Sparkles className="h-3 w-3" /> {weights.length ? 'Latest Logged Weight' : 'Profile Weight'}
            </span>
            {hasWeight ? (
              <>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <AnimatedCounter
                    value={toDisplayWeight(latestWeightKg, unit)}
                    decimals={1}
                    className="font-heading text-3xl sm:text-4xl font-extrabold text-[#F4F1EA]"
                  />
                  <span className="font-heading text-sm font-bold text-[#7BB38F]">{unit}</span>
                </div>
                {(firstWeight || latestWeightEntry) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#151F19] px-2 py-0.5 text-[0.6875rem] font-semibold text-[#7BB38F]">
                      {deltaKg < 0 ? (
                        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : deltaKg > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : null}
                      {deltaKg < 0 ? `−${deltaDisplay}` : deltaKg > 0 ? `+${deltaDisplay}` : '0'} {unit} since first log
                    </span>
                    <span className="text-[#B8B5AD] text-[0.6875rem]">
                      {firstWeight?.dateKey} → {latestWeightEntry?.dateKey} · Start: {formatWeight(firstWeight?.weightKg ?? 0, unit)}
                    </span>
                  </div>
                )}
                <p className="mt-1.5 text-xs text-[#B8B5AD]">{weights.length ? 'One check-in so far; another is needed for a change.' : 'No weight check-ins logged yet.'}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#B8B5AD]">No weight logged yet.</p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#151F19] border border-[#355440] text-[#7BB38F]">
            <Scale className="h-6 w-6" />
          </div>
        </div>

        <form onSubmit={handleLogWeight} className="mt-4 flex items-center gap-2 pt-3.5 border-t border-[#344A3C]">
          <div className="relative flex-1">
            <input
              type="number"
              aria-label={`Today's weight in ${unit}`}
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={`Enter today's weight (${unit})`}
              className="w-full rounded-xl border border-[#355440] bg-[#151F19] px-3.5 py-2 text-xs font-semibold text-[#F4F1EA] outline-none focus:border-[#7BB38F]"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] font-bold text-[#84877F]">
              {unit}
            </span>
          </div>
          <PressScale scaleDown={0.95}>
            <button type="submit" className="flex items-center gap-1.5 rounded-xl bg-[#528B67] hover:bg-[#5E9A74] px-4 py-2 text-xs font-bold text-[#F4F1EA]">
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Log Today</span>
            </button>
          </PressScale>
        </form>
      </div>

      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4" data-guide-target="progress-weekly-trend" aria-label="Weekly weight trend">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">7-Day Weight Trend Average</h2>
            <p className="text-[0.6875rem] text-[#84877F]">
              Never react to one day’s weight — the 7-day average smooths out water and sodium noise.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#7BB38F]">
            {weeklyWeightTrend.currentWeekDaysLogged}/7 logged
          </span>
        </div>

        {weeklyWeightTrend.currentWeekAvgKg !== null ? (
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="rounded-2xl border border-[#344A3C] bg-[#151F19] p-3">
              <div className="text-[0.625rem] font-semibold text-[#84877F] uppercase tracking-wider">This 7d average</div>
              <div className="font-heading text-2xl font-extrabold text-[#F4F1EA]">
                {toDisplayWeight(weeklyWeightTrend.currentWeekAvgKg, unit).toFixed(1)} {unit}
              </div>
            </div>
            <div className="rounded-2xl border border-[#344A3C] bg-[#151F19] p-3">
              <div className="text-[0.625rem] font-semibold text-[#84877F] uppercase tracking-wider">Week-over-week</div>
              <div className="font-heading text-2xl font-extrabold">
                {weeklyWeightTrend.weeklyTrendDeltaKg !== null ? (
                  <>
                    {weeklyWeightTrend.weeklyTrendDeltaKg < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : weeklyWeightTrend.weeklyTrendDeltaKg > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : null}
                    {weeklyWeightTrend.weeklyTrendDeltaKg >= 0 ? '+' : ''}{weeklyWeightTrend.weeklyTrendDeltaKg.toFixed(1)} {unit}
                  </>
                ) : (
                  <span className="text-[#B8B5AD]">Insufficient data</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#344A3C] bg-[#151F19] p-4 text-center">
            <p className="text-xs text-[#B8B5AD]">Log 2+ morning weigh-ins this week for your 7-day trend average.</p>
          </div>
        )}

        <p className="mt-2 text-xs leading-relaxed text-[#B8B5AD]">
          <strong>{weeklyWeightTrend.coachingHeadline}.</strong> {weeklyWeightTrend.coachingBody}
        </p>
      </div>

      {profile.onboarded ? (
        <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4" data-guide-target="progress-bmi" aria-label="Body mass index">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">Body Mass Index (BMI)</h2>
              <p className="text-[0.6875rem] text-[#84877F]">
                {bmiResult.healthyRangeKg ? (
                  <>
                    Adult BMI reference range for {profile.heightCm} cm:{' '}
                    <strong className="text-[#D8C39E]">
                      {formatWeight(bmiResult.healthyRangeKg[0], unit)} – {formatWeight(bmiResult.healthyRangeKg[1], unit)}
                    </strong>
                  </>
                ) : 'BMI needs an age-appropriate assessment below age 20.'}
              </p>
            </div>
            <div className="text-right">
              <div className="font-heading text-xl font-extrabold text-[#F4F1EA]">{bmiResult.bmi}</div>
              {bmiResult.category && (
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 text-[0.625rem] font-bold"
                  style={{
                    backgroundColor: bmiResult.badgeBg,
                    color: bmiResult.color,
                  }}
                >
                  {bmiResult.category}
                </span>
              )}
            </div>
          </div>

          {bmiResult.category && (
            <div className="mt-3 relative">
              <div className="h-2.5 w-full rounded-full overflow-hidden flex">
                <div className="w-[17.5%] bg-[#5F8D85]" />
                <div className="w-[32.5%] bg-[#6BA37E]" />
                <div className="w-[25%] bg-[#C89643]" />
                <div className="w-[25%] bg-[#C47451]" />
              </div>
              <div
                data-testid="bmi-marker"
                className="absolute -top-1 h-4 w-2 -translate-x-1/2 rounded-full bg-[#F4F1EA] shadow-md ring-2 ring-[#151A17]"
                style={{ left: `${bmiMarkerPct}%` }}
              />
              <div className="bmi-scale-labels" aria-label="BMI scale from 15 to 35">
                <span>15</span><span>18.5</span><span>25</span><span>30</span><span>35</span>
              </div>
            </div>
          )}

          <p className="mt-2.5 text-xs leading-relaxed text-[#B8B5AD]">{bmiResult.summary}</p>
        </div>
      ) : (
        <section className="profile-needed profile-needed-card" data-guide-target="progress-bmi" aria-label="Body mass index">
          <div>
            <strong>BMI is not available yet</strong>
            <p>Add your own profile details if you want a BMI estimate. It is a screening measure, not a diagnosis.</p>
          </div>
          <button type="button" onClick={onEditProfile}>
            Add profile details
          </button>
        </section>
      )}

      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4" data-guide-target="progress-chart" aria-label="Weight trend chart">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">
              Weight Trend (Last 14 Check-in Days)
            </h2>
            <p className="text-[0.6875rem] text-[#84877F]">
              Dates are spaced by time. Open the table for every value.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#7BB38F]">
            {weightChartData.length} pts
          </span>
        </div>

        <LineChart
          name="Weight trend"
          data={weightChartData}
          height={185}
          lineColor="#6BA37E"
          unitSuffix={` ${unit}`}
          yDecimals={1}
        />
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold text-[#7BB38F]">View weight trend data table</summary>
          <table aria-label="Weight trend data" className="mt-2 w-full text-left text-xs">
            <thead>
              <tr>
                <th scope="col" className="py-1 pr-3">Date</th>
                <th scope="col" className="py-1">Weight</th>
              </tr>
            </thead>
            <tbody>
              {weightChartData.map((item, index) => (
                <tr key={`${item.dateKey}-${index}`}>
                  <th scope="row" className="py-1 pr-3 font-medium">
                    {item.dateKey}
                  </th>
                  <td className="py-1">
                    {item.value === null ? 'Not logged' : `${item.value.toFixed(1)} ${unit}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">14-Day Food Energy</h2>
              <p className="text-[0.6875rem] text-[#84877F]">
                {macroTargets ? 'Dashed line is your current target, for reference only; past targets may have differed. Unlogged days are gaps.' : 'Logged food energy. Unlogged days are gaps, not zero intake.'}
              </p>
            </div>
            {macroTargets && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#D8C39E]">
                <Flame className="h-3.5 w-3.5" /> Current: {macroTargets.calories} kcal
              </span>
            )}
          </div>

          <LineChart
            name="Food energy"
            data={calorieChartData}
            height={185}
            lineColor="#C2A878"
            targetValue={macroTargets?.calories}
            targetLabel={macroTargets ? `Current ${macroTargets.calories}` : undefined}
            unitSuffix=" kcal"
            yDecimals={0}
          />
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold text-[#7BB38F]">View food energy data table</summary>
            <table aria-label="Food energy data" className="mt-2 w-full text-left text-xs">
              <thead>
                <tr>
                  <th scope="col" className="py-1 pr-3">Date</th>
                  <th scope="col" className="py-1">Energy</th>
                </tr>
              </thead>
              <tbody>
                {calorieChartData.map((item, index) => (
                  <tr key={`${item.dateKey}-${index}`}>
                    <th scope="row" className="py-1 pr-3 font-medium">
                      {item.dateKey}
                    </th>
                    <td className="py-1">
                      {item.value === null ? 'Not logged' : `${item.value.toFixed(0)} kcal`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>

        <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">14-Day Protein</h2>
              <p className="text-[0.6875rem] text-[#84877F]">
                Unlogged meal days are gaps, not zero intake.
              </p>
            </div>
            {macroTargets && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7BB38F]">
                Target: {macroTargets.proteinG}g
              </span>
            )}
          </div>

          <LineChart
            name="Protein"
            data={proteinChartData}
            height={185}
            lineColor="#6BA37E"
            targetValue={macroTargets?.proteinG}
            targetLabel={macroTargets ? `Target ${macroTargets.proteinG}g` : undefined}
            unitSuffix=" g"
            yDecimals={0}
          />
        </div>
      </div>

      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4" data-guide-target="progress-measurements" aria-label="Body measurements">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">Body Measurements</h2>
            <p className="text-[0.6875rem] text-[#84877F]">Waist, hips, chest, neck, arm, thigh & body fat %</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-[#528B67] hover:bg-[#5E9A74] px-3 py-1.5 text-[0.6875rem] font-semibold text-[#F4F1EA]"
            onClick={() => {}}
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> Log measurement
          </button>
        </div>
        <p className="text-xs text-[#B8B5AD]">Body measurement tracking coming soon — save waist, hip, chest, neck, arm, thigh circumferences and body fat % to see trend charts here.</p>
      </div>
    </div>
  );
};
