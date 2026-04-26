import { AlertTriangle } from 'lucide-react';
import { InlineMath, BlockMath } from '../components/Maths';
import { CodeBlock } from '../components/CodeBlock';
import { InteractivePriorSlider } from '../components/InteractivePriorSlider';
import { PriorPredictiveVisualization } from '../components/PriorPredictiveVisualization';
import { DistributionComparer } from '../components/DistributionComparer';

interface Props {
    priorMu: number;
    setPriorMu: (val: number) => void;
    priorSigma: number;
    setPriorSigma: (val: number) => void;
}

const FULL_MODEL_CODE = `import pymc as pm
import numpy as np
import arviz as az

# ── Synthetic data (replace with your real dataset) ──────────────────
rng = np.random.default_rng(42)
# True underlying log-location ≈ 1.1 → median duration ≈ 3 months
clinical_data = rng.lognormal(mean=1.1, sigma=0.6, size=80)

# ── Bayesian Model ────────────────────────────────────────────────────
with pm.Model() as long_covid_model:

    # --- Priors ---
    # log_mu: prior on the log-scale location. exp(log_mu) = median duration
    log_mu    = pm.Normal("log_mu", mu=0, sigma=1)

    # obs_noise: SD on log-scale (must be positive → HalfNormal)
    obs_noise = pm.HalfNormal("obs_noise", sigma=1.0)

    # --- Likelihood ---
    # LogNormal keeps durations strictly positive and handles right-skew
    obs = pm.LogNormal("obs", mu=log_mu, sigma=obs_noise,
                       observed=clinical_data)

    # --- Derived quantity ---
    # Back-transform to get the population median duration in months
    median_duration = pm.Deterministic("median_duration",
                                       pm.math.exp(log_mu))`;

const PRIOR_PRED_CODE = `with long_covid_model:
    # Draw 500 full datasets from the prior (before seeing clinical_data)
    prior_pred = pm.sample_prior_predictive(samples=500, random_seed=42)

import matplotlib.pyplot as plt
import arviz as az

# Plot: are simulated durations scientifically plausible?
az.plot_ppc(prior_pred, group="prior", observed=False,
            kind="kde", figsize=(8, 3))
plt.axvline(0,  color="red", linestyle="--", label="Impossible: 0 months")
plt.axvline(48, color="orange", linestyle="--", label="Implausible: 4 years")
plt.xlim(-1, 60)
plt.title("Prior Predictive: Simulated Symptom Durations (months)")
plt.legend()
plt.show()

# Key question: does the model ever generate negative values?
print(f"Min simulated duration: {prior_pred.prior_predictive['obs'].min().item():.2f}")
# For LogNormal this is always > 0 — good!`;

const SENSITIVITY_CODE = `import pymc as pm
import arviz as az
import matplotlib.pyplot as plt

idatas = {}
for prior_sigma in [0.5, 1.0, 2.0]:
    with pm.Model() as m:
        log_mu    = pm.Normal("log_mu", mu=0, sigma=prior_sigma)
        obs_noise = pm.HalfNormal("obs_noise", sigma=1.0)
        obs       = pm.LogNormal("obs", mu=log_mu, sigma=obs_noise,
                                 observed=clinical_data)
        idatas[f"σ_prior={prior_sigma}"] = pm.sample(
            draws=2000, tune=1000, chains=4,
            progressbar=False, random_seed=42
        )

# If posteriors are similar → conclusions robust to prior choice
az.plot_forest(
    list(idatas.values()),
    model_names=list(idatas.keys()),
    var_names=["log_mu"], combined=True, hdi_prob=0.94
)
plt.title("Sensitivity Analysis: How prior width affects posterior log_mu")
plt.show()`;

const DIST_TABLE = [
    { name: 'Normal', pkg: 'pm.Normal', domain: '(−∞, +∞)', use: 'Residuals, regression coefficients, log-transformed data', tag: 'Symmetric', tagClass: 'bg-blue-100 text-blue-700' },
    { name: 'LogNormal', pkg: 'pm.LogNormal', domain: '(0, +∞)', use: 'Durations, income, response times — positive & right-skewed', tag: 'Right-skewed', tagClass: 'bg-amber-100 text-amber-700' },
    { name: 'HalfNormal', pkg: 'pm.HalfNormal', domain: '(0, +∞)', use: 'Standard deviations, scale parameters — must be positive', tag: 'Scale', tagClass: 'bg-emerald-100 text-emerald-700' },
    { name: 'Poisson', pkg: 'pm.Poisson', domain: '0, 1, 2, …', use: 'Event counts (hospitalisations per week)', tag: 'Counts', tagClass: 'bg-purple-100 text-purple-700' },
    { name: 'Beta', pkg: 'pm.Beta', domain: '(0, 1)', use: 'Proportions, recovery rates, probabilities', tag: 'Proportions', tagClass: 'bg-pink-100 text-pink-700' },
    { name: 'Bernoulli', pkg: 'pm.Bernoulli', domain: '{0, 1}', use: 'Binary outcomes (recovered / not recovered)', tag: 'Binary', tagClass: 'bg-indigo-100 text-indigo-700' },
];

export function ChapterModelBuilding({ priorMu, setPriorMu, priorSigma, setPriorSigma }: Props) {
    return (
        <div className="space-y-16 pb-16">

            {/* 1. Generative Story */}
            <section className="space-y-5">
                <h3 className="text-2xl font-bold text-slate-800">1. Defining the Generative Story</h3>
                <p className="text-[17px] text-slate-600 leading-[1.85]">
                    A Bayesian model is a mathematical story of how the observed data came to exist.
                    For our Long COVID-style study, we model individual patient symptom durations as draws
                    from a <strong>LogNormal distribution</strong> whose log-scale location and variance are
                    themselves uncertain parameters. The dataset here is synthetic, but it is shaped to
                    behave like a plausible duration study.
                </p>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="text-sm font-semibold text-slate-700">Our model in mathematical notation:</div>
                    {[
                        { math: '\\eta \\sim \\mathcal{N}(0, 1)', label: 'Prior on log-median duration (log_mu in code)' },
                        { math: '\\sigma_{\\text{obs}} \\sim \\text{HalfNormal}(1)', label: 'Prior on log-scale noise' },
                        { math: 'x_i \\sim \\text{LogNormal}(\\eta,\\; \\sigma_{\\text{obs}})', label: 'Likelihood — how data is generated' },
                        { math: '\\mu_{\\text{median}} = e^{\\eta}', label: 'Derived quantity — median duration in months' },
                    ].map(eq => (
                        <div key={eq.math} className="grid grid-cols-[1fr_auto] items-center gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                            <BlockMath math={eq.math} />
                            <div className="text-xs text-slate-500 text-right min-w-[140px]">{eq.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 2. Choosing the Right Likelihood */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">2. Choosing the Right Likelihood</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    The likelihood must match the <em>nature</em> of your outcome variable.
                    One of the most common modeling errors is using a Normal distribution when the
                    outcome is strictly positive — this incorrectly allows negative predictions.
                    Distribution choice is not just technical; it encodes what outcomes the model believes
                    are possible.
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-left font-semibold text-slate-600">Distribution</th>
                                <th className="p-4 text-left font-semibold text-slate-600">PyMC</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Domain</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Use When…</th>
                                <th className="p-4 text-left font-semibold text-slate-600">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {DIST_TABLE.map((d, i) => (
                                <tr key={d.name} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                    <td className="p-4 font-semibold text-slate-800">{d.name}</td>
                                    <td className="p-4 font-mono text-xs text-indigo-700 bg-indigo-50/40 rounded">{d.pkg}</td>
                                    <td className="p-4 font-mono text-xs text-slate-500">{d.domain}</td>
                                    <td className="p-4 text-slate-600 text-[13px]">{d.use}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${d.tagClass}`}>{d.tag}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                    <AlertTriangle className="shrink-0 text-amber-500 mt-0.5" size={18} />
                    <p className="text-sm text-slate-600">
                        <strong>Our choice:</strong> symptom durations are always positive and right-skewed
                        (most patients recover in 1–4 months, a few linger much longer). <InlineMath math="\text{LogNormal}" /> is
                        the natural choice. Using <InlineMath math="\mathcal{N}" /> would allow negative durations — scientifically impossible.
                    </p>
                </div>
            </section>

            {/* Interactive: Distribution Comparer */}
            <section className="space-y-5 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">Interactive: Normal vs. LogNormal — See the Difference</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    Drag the sliders to explore how the two distributions diverge. Watch the <strong>percentage
                        of probability mass below zero</strong> update in real time — a clear demonstration of
                    why Normal is wrong for duration data.
                </p>
                <DistributionComparer />
            </section>

            {/* 3. Prior Elicitation */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">3. Prior Elicitation</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    A prior on the log-scale location <InlineMath math="\eta \sim \mathcal{N}(0, 1)" /> translates
                    to a prior on the median duration of <InlineMath math="\exp(\eta)" />.
                    We put the prior on the log scale because raw symptom duration must stay positive.
                    When <InlineMath math="\eta = 0" />, median duration = 1 month.
                    When <InlineMath math="\eta = 1.1" />, median ≈ 3 months.
                    Adjust the sliders below to explore how the prior shape changes.
                </p>
                <InteractivePriorSlider
                    mu={priorMu} sigma={priorSigma}
                    onChange={(m, s) => { setPriorMu(m); setPriorSigma(s); }}
                    title="Shape Your Prior on the Log-Scale Location"
                    description="Narrow = confident beliefs. Wide = high uncertainty. The chart shows the implied prior distribution on the log-scale."
                />
                <CodeBlock code={FULL_MODEL_CODE} title="PyMC – Full Model Definition (complete, runnable)" />
                <PriorPredictiveVisualization mu={priorMu} sigma={priorSigma} />
            </section>

            {/* 4. Prior Predictive Check */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">4. Prior Predictive Check</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    Before any real data is observed, simulate complete datasets from the prior.
                    If the model generates durations of −50 months or 200 years, the prior is
                    misspecified and must be revised. This is <strong>Step 2 of the Bayesian Workflow</strong>.
                    For the final LogNormal model, negative durations are structurally impossible; the check
                    still matters because it can reveal implausibly huge durations or overly vague assumptions.
                </p>
                <CodeBlock code={PRIOR_PRED_CODE} title="PyMC + ArviZ – Prior Predictive Sampling" />
            </section>

            {/* 5. Sensitivity Analysis */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">5. Prior Sensitivity Analysis</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    A robust analysis produces qualitatively similar posteriors across reasonable prior
                    specifications. If the conclusion changes dramatically when <InlineMath math="\sigma_0" /> shifts
                    from 0.5 to 2.0, the data is insufficient to overcome the prior — a key warning sign.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        { label: 'Weakly Informative', prior: '\\mathcal{N}(0, 1)', note: 'Default. Regularizes without imposing strong beliefs.', color: 'emerald', rec: true },
                        { label: 'Skeptical', prior: '\\mathcal{N}(0, 0.5)', note: 'Favors short durations. Use only with strong prior literature.', color: 'blue', rec: false },
                        { label: 'Diffuse', prior: '\\mathcal{N}(0, 3)', note: 'Very little regularization. May cause sampling pathologies.', color: 'amber', rec: false },
                    ].map(p => (
                        <div key={p.label} className={`p-5 rounded-xl border ${p.rec ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                            {p.rec && <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full mb-2 inline-block">Recommended</span>}
                            <div className="font-semibold text-slate-800 text-sm mb-2">{p.label}</div>
                            <InlineMath math={p.prior} />
                            <div className="text-xs text-slate-500 leading-relaxed mt-2">{p.note}</div>
                        </div>
                    ))}
                </div>
                <CodeBlock code={SENSITIVITY_CODE} title="Python – Comparing Posteriors Under Different Priors" />
            </section>

        </div>
    );
}
