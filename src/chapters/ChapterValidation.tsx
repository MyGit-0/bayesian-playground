import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { InlineMath, BlockMath } from '../components/Maths';
import { CodeBlock } from '../components/CodeBlock';
import { IterativeModelComparison } from '../components/IterativeModelComparison';
import { CalibrationPITVisual } from '../components/CalibrationPITVisual';

const DIAGNOSTICS_GOOD = [
    { name: 'log_mu', mean: 1.08, sd: 0.07, hdi_lo: 0.95, hdi_hi: 1.21, rhat: 1.001, ess_bulk: 3891, ess_tail: 3102 },
    { name: 'obs_noise', mean: 0.59, sd: 0.05, hdi_lo: 0.50, hdi_hi: 0.68, rhat: 1.000, ess_bulk: 4021, ess_tail: 3554 },
    { name: 'median_duration', mean: 2.95, sd: 0.21, hdi_lo: 2.57, hdi_hi: 3.36, rhat: 1.001, ess_bulk: 3891, ess_tail: 3102 },
];
const DIAGNOSTICS_BAD = [
    { name: 'log_mu', mean: 1.12, sd: 0.15, hdi_lo: 0.72, hdi_hi: 1.48, rhat: 1.08, ess_bulk: 198, ess_tail: 152 },
    { name: 'obs_noise', mean: 0.61, sd: 0.22, hdi_lo: 0.14, hdi_hi: 0.99, rhat: 1.12, ess_bulk: 134, ess_tail: 89 },
];

const PITFALLS = [
    { num: '01', title: 'Skipping Prior Predictive Checks', severity: 'high', desc: 'If you never simulate from the prior, you may fit a model that can generate impossibly negative durations or durations of 500 years. Always check before fitting.' },
    { num: '02', title: 'Reporting Without Checking R̂ or ESS', severity: 'critical', desc: 'An R̂ > 1.01 means chains have not converged — the posterior is unreliable. Publishing such results is a serious scientific error. Check diagnostics before any inference.' },
    { num: '03', title: 'Using Flat (Improper) Priors in Hierarchical Models', severity: 'high', desc: 'Flat priors (Uniform(−∞, +∞)) can seem "objective," but they are especially risky in hierarchical models. The variance component σ_pop often needs a weakly informative prior to stay identifiable and numerically stable.' },
    { num: '04', title: 'Confusing HDI with Confidence Interval', severity: 'medium', desc: '"The 95% CI contains the true value with 95% probability" is WRONG for frequentist CIs. Only a Bayesian HDI allows that statement.' },
    { num: '05', title: 'Not Accounting for Multiple Comparisons', severity: 'medium', desc: 'When comparing 10 hospitals simultaneously, a strictly frequentist analysis needs a Bonferroni or FDR correction. A full hierarchical model naturally regularizes estimates.' },
    { num: '06', title: 'Treating the Posterior as a Point Estimate', severity: 'medium', desc: 'Using just the posterior mean discards the entire uncertainty distribution. Always report the HDI to communicate what you do NOT know.' },
];

const CONVERGENCE_CODE = `import arviz as az

# --- Core diagnostic table ---
summary = az.summary(idata,
                     var_names=["log_mu", "obs_noise", "median_duration"],
                     hdi_prob=0.94)
print(summary)

# --- Automated assertions ---
assert (summary["r_hat"] < 1.01).all(),    "CONVERGENCE FAILURE: R̂ > 1.01"
assert (summary["ess_bulk"] > 400).all(),  "LOW ESS: increase draws"

# --- Visual checks ---
az.plot_trace(idata, var_names=["log_mu", "obs_noise"])
# Trace plots should look like stationary "fuzzy caterpillars"

# --- Energy check (BFMI) ---
az.plot_energy(idata)
# BFMI > 0.3 is a useful rule of thumb; lower values suggest posterior geometry problems

# --- Divergence count ---
n_div = idata.sample_stats.diverging.sum().item()
print(f"Divergences: {n_div}")
# Any divergences = increase target_accept or reparameterize`;

const LOO_CODE = `import pymc as pm
import arviz as az

# --- Compute LOO for the baseline model ---
with long_covid_model:
    idata_base = pm.sample(
        draws=2000, tune=1000, chains=4, target_accept=0.9,
        random_seed=42, idata_kwargs={"log_likelihood": True}
    )

loo_base = az.loo(idata_base, pointwise=True)

# --- Extended model: add Age as a covariate ---
age_z = (patient_ages - patient_ages.mean()) / patient_ages.std()

with pm.Model() as model_with_age:
    log_mu   = pm.Normal("log_mu", mu=0, sigma=1)
    beta_age = pm.Normal("beta_age", mu=0, sigma=0.5)
    sigma    = pm.HalfNormal("obs_noise", sigma=1.0)
    mu_i     = log_mu + beta_age * age_z
    obs      = pm.LogNormal("obs", mu=mu_i, sigma=sigma,
                            observed=clinical_data)
    idata_age = pm.sample(
        draws=2000, tune=1000, chains=4, target_accept=0.9,
        random_seed=42, idata_kwargs={"log_likelihood": True}
    )

loo_age = az.loo(idata_age, pointwise=True)

# --- Compare: higher ELPD = better predictive model ---
comparison = az.compare(
    {"baseline": idata_base, "with_age": idata_age},
    ic="loo", scale="log"
)
print(comparison)
#            elpd_loo  p_loo  elpd_diff  weight    se   dse  warning
# with_age     -98.3    3.2       0.0    0.83    5.4   0.0    False
# baseline    -103.1    2.1      -4.8    0.17    5.6   3.2    False
# → Adding Age improves LOO by 4.8 ELPD units — a meaningful improvement`;

const PPC_CODE = `import pymc as pm
import arviz as az
import matplotlib.pyplot as plt
import numpy as np

with long_covid_model:
    idata = pm.sample_posterior_predictive(
        idata,
        var_names=["obs"],
        extend_inferencedata=True,
        random_seed=42,
    )

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

# 1. KDE overlay: model vs observed
az.plot_ppc(idata, group="posterior", ax=axes[0],
            num_pp_samples=100)
axes[0].set_title("PPC: Simulated vs Observed Durations")

# 2. Test statistic: 90th percentile (checking tail behaviour)
ppc_draws = idata.posterior_predictive["obs"].values.reshape(-1, 80)
ppc_90th  = np.percentile(ppc_draws, 90, axis=1)
obs_90th  = np.percentile(clinical_data, 90)

axes[1].hist(ppc_90th, bins=40, density=True,
             color="steelblue", alpha=0.6, label="Posterior predictive")
axes[1].axvline(obs_90th, color="red", lw=2,
                label=f"Observed 90th pct = {obs_90th:.1f} mo")
axes[1].set_title("PPC: 90th Percentile Check (tail behaviour)")
axes[1].legend(fontsize=9)

plt.tight_layout()
plt.show()

# Bayesian p-value: ~0.5 = well calibrated, near 0 or 1 = systematic misfit
bayesian_p = (ppc_90th > obs_90th).mean()
print(f"Bayesian p-value (90th pct): {bayesian_p:.2f}")`;

const LOO_PIT_CODE = `import pymc as pm
import arviz as az
import matplotlib.pyplot as plt

# Requires an InferenceData with both log_likelihood and posterior_predictive groups.
# If needed, run:
# with long_covid_model:
#     pm.compute_log_likelihood(idata, extend_inferencedata=True)
#     idata = pm.sample_posterior_predictive(idata, extend_inferencedata=True)

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

# LOO-PIT histogram: should be Uniform(0, 1) for well-calibrated model
az.plot_loo_pit(idata, y="obs", ax=axes[0])
axes[0].set_title("LOO-PIT Histogram\\n"
                  "(Uniform = well calibrated ✅)")

# Cumulative LOO-PIT: should lie on the diagonal
az.plot_loo_pit(idata, y="obs", ecdf=True, ax=axes[1])
axes[1].set_title("Cumulative LOO-PIT\\n"
                  "(should hug the diagonal)")

plt.tight_layout()
plt.show()

# Interpretation:
#  U-shaped   → model is OVERCONFIDENT (prediction intervals too narrow)
#  Hump-shaped → model is UNDERCONFIDENT (prediction intervals too wide)
#  Uniform    → well calibrated`;

const DECISION_CODE = `import numpy as np
import pymc as pm

# After MCMC we have 8000 samples from the posterior
posterior_median = idata.posterior["median_duration"].values.flatten()

# ── Loss functions determine the optimal action ──────────────────────
# Squared error loss → optimal action = posterior MEAN
decision_mean = posterior_median.mean()

# Absolute error loss → optimal action = posterior MEDIAN
decision_median = np.median(posterior_median)

# 0-1 loss (classification) → optimal = posterior MODE
from scipy.stats import gaussian_kde
kde  = gaussian_kde(posterior_median)
grid = np.linspace(posterior_median.min(), posterior_median.max(), 1000)
decision_mode = grid[np.argmax(kde(grid))]

print(f"Posterior mean   (min squared error): {decision_mean:.2f} months")
print(f"Posterior median (min absolute error): {decision_median:.2f} months")
print(f"Posterior mode   (min 0-1 error):      {decision_mode:.2f} months")

# ── Threshold decision: P(duration > 6 months) for clinical triage ──
# For a future patient, use the posterior predictive distribution,
# not only the posterior over the population median.
if "posterior_predictive" not in idata.groups():
    with long_covid_model:
        idata = pm.sample_posterior_predictive(
            idata,
            var_names=["obs"],
            extend_inferencedata=True,
            random_seed=42,
        )

posterior_predictive = idata.posterior_predictive["obs"].values.reshape(-1)
prob_future_duration_gt_6 = (posterior_predictive > 6).mean()
prob_population_median_gt_6 = (posterior_median > 6).mean()

print(f"\\nP(future duration > 6 months | data) = {prob_future_duration_gt_6:.1%}")
print(f"P(population median > 6 months | data) = {prob_population_median_gt_6:.1%}")
# The first is a patient-level predictive probability; the second is a parameter probability.`;

const PARETO_CODE = `import arviz as az
import numpy as np
import matplotlib.pyplot as plt

# Compute LOO with pointwise Pareto-k per observation
loo_result = az.loo(idata, pointwise=True)
pareto_k   = loo_result.pareto_k.values

# Visualize influence of each patient
fig, ax = plt.subplots(figsize=(10, 3))
colors = ["red" if k > 0.7 else "orange" if k > 0.5 else "steelblue"
          for k in pareto_k]
ax.scatter(range(len(pareto_k)), pareto_k, c=colors, alpha=0.7, s=30)
ax.axhline(0.5, color="orange", linestyle="--", label="k=0.5 (warning)")
ax.axhline(0.7, color="red",    linestyle="--", label="k=0.7 (bad)")
ax.set(xlabel="Patient index", ylabel="Pareto-k",
       title="LOO Pareto-k: Identifying Influential Observations")
ax.legend()
plt.tight_layout()
plt.show()

# Identify problematic patients
bad = np.where(pareto_k > 0.7)[0]
print(f"Influential observations: patient indices {bad}")
print(f"Their reported durations: {clinical_data[bad].round(1)} months")
# High k = model struggles to predict this patient → check for outliers
# or switch to a heavier-tailed likelihood (e.g., pm.StudentT)`;

function RHatBadge({ v }: { v: number }) {
    const ok = v < 1.01;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {ok ? <CheckCircle size={9} /> : <XCircle size={9} />}{v.toFixed(3)}
    </span>;
}
function ESSBadge({ v }: { v: number }) {
    const ok = v >= 400;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {ok ? <CheckCircle size={9} /> : <AlertTriangle size={9} />}{v.toLocaleString()}
    </span>;
}

const DIAGNOSTIC_CARD_STYLES = {
    blue: {
        card: 'border-blue-100 bg-blue-50/40',
        title: 'text-blue-800',
        threshold: 'text-blue-700 bg-blue-100/60',
    },
    purple: {
        card: 'border-purple-100 bg-purple-50/40',
        title: 'text-purple-800',
        threshold: 'text-purple-700 bg-purple-100/60',
    },
};

const DECISION_CARD_STYLES = {
    blue: {
        card: 'border-blue-100 bg-blue-50/40',
        title: 'text-blue-800',
        optimal: 'text-blue-700',
    },
    purple: {
        card: 'border-purple-100 bg-purple-50/40',
        title: 'text-purple-800',
        optimal: 'text-purple-700',
    },
    emerald: {
        card: 'border-emerald-100 bg-emerald-50/40',
        title: 'text-emerald-800',
        optimal: 'text-emerald-700',
    },
};

export function ChapterValidation() {
    const [showBad, setShowBad] = useState(false);
    const rows = showBad ? DIAGNOSTICS_BAD : DIAGNOSTICS_GOOD;

    return (
        <div className="space-y-16 pb-16">

            {/* 1. Convergence Diagnostics */}
            <section className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800">1. MCMC Convergence Diagnostics</h3>
                <p className="text-[17px] text-slate-600 leading-[1.85]">
                    Before trusting any conclusion, you <strong>must</strong> verify that MCMC worked.
                    Two non-negotiable diagnostics are <InlineMath math="\hat{R}" /> (Gelman-Rubin) and
                    ESS (Effective Sample Size).
                    These diagnostics do not prove the model is true; they tell you whether the sampler has
                    produced a usable approximation to the posterior you asked for.
                    Divergences are another warning: they often appear when parameters are highly correlated,
                    weakly identified, or can trade off against each other in a difficult posterior geometry.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                    {[
                        { title: 'R̂ (Gelman-Rubin)', styles: DIAGNOSTIC_CARD_STYLES.blue, body: 'Compares within-chain vs between-chain variance. If all 4 chains converged, R̂ ≈ 1.000.', formula: '\\hat{R} = \\sqrt{\\frac{\\hat{V}}{W}}', thresh: 'R̂ < 1.01 required · R̂ > 1.05 = failure' },
                        { title: 'ESS (Effective Sample Size)', styles: DIAGNOSTIC_CARD_STYLES.purple, body: 'MCMC draws are autocorrelated — not truly independent. ESS is the equivalent number of independent samples.', formula: '\\text{ESS} = \\frac{N}{1 + 2\\sum_{k=1}^\\infty \\rho_k}', thresh: 'ESS > 400 total minimum; more is better' },
                    ].map(c => (
                        <div key={c.title} className={`p-5 rounded-xl border space-y-3 ${c.styles.card}`}>
                            <div className={`font-bold ${c.styles.title}`}>{c.title}</div>
                            <p className="text-sm text-slate-600">{c.body}</p>
                            <BlockMath math={c.formula} />
                            <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${c.styles.threshold}`}>{c.thresh}</div>
                        </div>
                    ))}
                </div>
                <CodeBlock code={CONVERGENCE_CODE} title="ArviZ – Convergence Diagnostics (assertions + visuals)" />

                {/* Interactive table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800">Simulated ArviZ Summary</h4>
                        <div className="flex gap-2">
                            <button onClick={() => setShowBad(false)} className={`text-xs px-3 py-1 rounded-full font-semibold ${!showBad ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>✅ Converged</button>
                            <button onClick={() => setShowBad(true)} className={`text-xs px-3 py-1 rounded-full font-semibold ${showBad ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>❌ Failed</button>
                        </div>
                    </div>
                    {showBad && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex gap-2 text-xs text-red-700">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>High R̂ and low ESS indicate the sampler did not converge. Do not report these results.</span>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono">
                            <thead>
                                <tr className="bg-slate-50 border-b text-slate-500">
                                    {['Parameter', 'mean', 'sd', 'hdi 3%', 'hdi 97%', 'r_hat', 'ess_bulk', 'ess_tail'].map(h => (
                                        <th key={h} className="p-3 text-left font-sans font-semibold">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {rows.map(r => (
                                    <tr key={r.name} className="bg-white hover:bg-slate-50">
                                        <td className="p-3 text-indigo-700 font-semibold font-sans">{r.name}</td>
                                        <td className="p-3">{r.mean.toFixed(2)}</td>
                                        <td className="p-3 text-slate-400">{r.sd.toFixed(2)}</td>
                                        <td className="p-3 text-slate-400">{r.hdi_lo.toFixed(2)}</td>
                                        <td className="p-3 text-slate-400">{r.hdi_hi.toFixed(2)}</td>
                                        <td className="p-3"><RHatBadge v={r.rhat} /></td>
                                        <td className="p-3"><ESSBadge v={r.ess_bulk} /></td>
                                        <td className="p-3"><ESSBadge v={r.ess_tail} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* 2. Model Comparison */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">2. Model Comparison via LOO-CV</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    Leave-One-Out Cross-Validation (LOO-CV), implemented via Pareto-Smoothed Importance Sampling
                    (PSIS-LOO), estimates out-of-sample predictive accuracy. The metric ELPD (Expected Log Predictive
                    Density) measures how well the model would predict a new, unseen patient. Higher ELPD = better model.
                    Treat small differences cautiously: the standard error tells you whether the improvement is
                    large enough to matter.
                </p>
                <BlockMath math={`\\text{ELPD}_{\\text{LOO}} = \\sum_{i=1}^n \\log p(y_i \\mid y_{-i}) \\approx \\sum_{i=1}^n \\log \\int p(y_i \\mid \\theta)\\, p(\\theta \\mid y_{-i})\\, d\\theta`} />
                <IterativeModelComparison />
                <CodeBlock code={LOO_CODE} title="ArviZ – LOO Model Comparison" />
            </section>

            {/* 3. Posterior Predictive Checks */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">3. Posterior Predictive Checks (PPC)</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    Does the fitted model, when used to simulate new data, produce data that resembles the real
                    observations? PPCs reveal systematic model misspecification — patterns in real data that
                    the model cannot replicate.
                    They are most useful when you choose a clinically meaningful feature to check, such as the
                    90th percentile duration or the fraction of long recoveries.
                </p>
                <CodeBlock code={PPC_CODE} title="PyMC + ArviZ – Posterior Predictive Check" />
            </section>

            {/* 4. Calibration */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">4. Predictive Calibration (LOO-PIT)</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    A model is <strong>calibrated</strong> if its stated confidence matches its actual accuracy.
                    For a well-calibrated model, the Probability Integral Transform (PIT) of held-out observations
                    should be uniform. If it is U-shaped, the model is overconfident — its prediction intervals
                    are narrower than reality.
                    If it is hump-shaped, the model is underconfident and its prediction intervals are wider
                    than the data require.
                </p>
                <CalibrationPITVisual />
                <CodeBlock code={LOO_PIT_CODE} title="ArviZ – LOO-PIT Calibration Diagnostic" />
            </section>

            {/* 5. Sensitivity Analysis */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">5. Sensitivity Analysis via Pareto-k</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    PSIS-LOO provides a per-observation diagnostic: the Pareto-k value. Patients with
                    <InlineMath math=" k > 0.7 " /> are <em>influential</em> — the model struggles to
                    predict them, suggesting they may be outliers or that the model's tails are too thin.
                    High Pareto-k is a prompt to inspect those observations, not an automatic reason to delete them.
                </p>
                <CodeBlock code={PARETO_CODE} title="ArviZ – Pareto-k: Identifying Influential Observations" />
            </section>

            {/* 6. Decision Theory */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">6. Decision Theory — Acting on Posteriors</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    The posterior distribution is not a final answer — it is an input to a <strong>decision</strong>.
                    Decision theory provides a principled way to map posterior uncertainty to actions by specifying
                    a <em>loss function</em> <InlineMath math="L(\hat{\theta}, \theta)" />. The optimal decision
                    minimises expected posterior loss:
                </p>
                <BlockMath math={`\\hat{\\theta}^* = \\argmin_{\\hat{\\theta}} \\; \\mathbb{E}_{\\theta|D}\\left[L(\\hat{\\theta}, \\theta)\\right]`} />
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        { loss: 'Squared Error', formula: '(\\hat{\\theta} - \\theta)^2', optimal: 'Posterior Mean', styles: DECISION_CARD_STYLES.blue },
                        { loss: 'Absolute Error', formula: '|\\hat{\\theta} - \\theta|', optimal: 'Posterior Median', styles: DECISION_CARD_STYLES.purple },
                        { loss: '0-1 Loss', formula: '\\mathbf{1}_{\\hat{\\theta} \\neq \\theta}', optimal: 'Posterior Mode', styles: DECISION_CARD_STYLES.emerald },
                    ].map(d => (
                        <div key={d.loss} className={`p-5 rounded-xl border ${d.styles.card}`}>
                            <div className={`font-bold text-sm mb-2 ${d.styles.title}`}>{d.loss}</div>
                            <BlockMath math={d.formula} />
                            <div className="text-xs text-slate-500 mt-2">Optimal decision: <strong className={d.styles.optimal}>{d.optimal}</strong></div>
                        </div>
                    ))}
                </div>
                <CodeBlock code={DECISION_CODE} title="Python – Making Clinical Decisions from the Posterior" />
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                    <Info size={16} className="shrink-0 text-blue-500 mt-0.5" />
                    <p className="text-sm text-slate-600">
                        Unlike a frequentist analysis, the posterior predictive distribution allows direct probability statements:
                        <em> "P(future duration &gt; 6 months | data, model) = 12%."</em> This is directly actionable for clinical
                        triage, resource allocation, and treatment decisions.
                    </p>
                </div>
            </section>

            {/* 7. Common Pitfalls */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">7. Common Pitfalls & Anti-patterns</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    These are the mistakes most commonly encountered when applying Bayesian inference in practice.
                    Awareness is the first step to avoiding them.
                </p>
                <div className="space-y-3">
                    {PITFALLS.map(p => (
                        <div key={p.num} className={`flex gap-4 p-5 rounded-xl border ${p.severity === 'critical' ? 'border-red-200 bg-red-50/40' : p.severity === 'high' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-slate-50'}`}>
                            <div className={`text-xs font-bold shrink-0 mt-0.5 w-8 text-center py-1 rounded-md ${p.severity === 'critical' ? 'bg-red-100 text-red-700' : p.severity === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                {p.num}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-slate-800 text-sm">{p.title}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${p.severity === 'critical' ? 'bg-red-100 text-red-600' : p.severity === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {p.severity.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Colab CTA */}
                <div className="mt-6 p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 text-center">
                    <h4 className="text-lg font-bold text-blue-900 mb-2">Run the Full Analysis in Colab</h4>
                    <p className="text-blue-700/80 mb-5 text-sm max-w-lg mx-auto">
                        All code from this guide is consolidated into a single annotated notebook with realistic synthetic data, diagnostic plots, and model comparison.
                    </p>
                    <a href="https://colab.research.google.com/github/Amirreza-0/bayesian-playground/blob/main/notebooks/long_covid_bayesian_workflow_colab.ipynb" target="_blank" rel="noreferrer"
                        className="inline-flex shadow-xl shadow-blue-500/20 items-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors">
                        Launch Interactive Notebook
                    </a>
                </div>
            </section>

        </div>
    );
}
