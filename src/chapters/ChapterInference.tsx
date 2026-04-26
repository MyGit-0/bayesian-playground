import { useState } from 'react';
import { Info } from 'lucide-react';
import { InlineMath, BlockMath } from '../components/Maths';
import { CodeBlock } from '../components/CodeBlock';
import { PosteriorUpdateVisualization } from '../components/PosteriorUpdateVisualization';
import { MCMCTraceViewer } from '../components/MCMCTraceViewer';
import { HierarchicalModelingVisual } from '../components/HierarchicalModelingVisual';
import { MCMCSamplingVisualizer } from '../components/MCMCSamplingVisualizer';

interface Props {
    priorMu: number;
    priorSigma: number;
    dataMu: number;
    setDataMu: (val: number) => void;
    dataSigma: number;
    setDataSigma: (val: number) => void;
}

const MCMC_CODE = `import pymc as pm
import numpy as np
import arviz as az

rng = np.random.default_rng(42)
clinical_data = rng.lognormal(mean=1.1, sigma=0.6, size=80)

with pm.Model() as long_covid_model:
    log_mu    = pm.Normal("log_mu", mu=0, sigma=1)
    obs_noise = pm.HalfNormal("obs_noise", sigma=1.0)
    obs       = pm.LogNormal("obs", mu=log_mu, sigma=obs_noise,
                             observed=clinical_data)
    median_duration = pm.Deterministic("median_duration",
                                       pm.math.exp(log_mu))

    # 4 independent chains × 2000 draws = 8000 posterior samples
    idata = pm.sample(
        draws=2000,
        tune=1000,        # NUTS tuning phase (adapts step size; samples discarded)
        chains=4,
        target_accept=0.9,  # NUTS step-size tuning
        random_seed=42,
        return_inferencedata=True,
        idata_kwargs={"log_likelihood": True},  # Needed for LOO/WAIC later
    )

# ArviZ summary: the single most important diagnostic table
summary = az.summary(idata,
                     var_names=["log_mu", "obs_noise", "median_duration"],
                     hdi_prob=0.94)
print(summary)
#             mean    sd  hdi_3%  hdi_97%  r_hat  ess_bulk
# log_mu      1.08  0.07    0.95     1.21   1.00      3890
# obs_noise   0.59  0.05    0.50     0.68   1.00      4021
# median_duration  2.95  0.21    2.57     3.36   1.00      3890`;

const POSTERIOR_CODE = `import arviz as az
import matplotlib.pyplot as plt

# Full marginal posterior for median_duration
az.plot_posterior(idata, var_names=["median_duration"],
                  hdi_prob=0.94, point_estimate="mean")
# Interpretation: "Given our model and data, there is a 94% probability
# that the true median duration lies between 2.57 and 3.36 months."

# Trace plots — should look like "fuzzy caterpillars" (stationary + mixing)
az.plot_trace(idata, var_names=["log_mu", "obs_noise"])

# Forest plot: compare multiple parameters or models side-by-side
az.plot_forest(idata, var_names=["median_duration"],
               hdi_prob=0.94, combined=True)
plt.axvline(3.0, linestyle="--", color="gray",
            label="Clinical benchmark: 3 months")
plt.legend()
plt.show()`;

const HIER_CODE = `import pymc as pm
import numpy as np
import arviz as az

rng = np.random.default_rng(42)
hospital_idx = np.array([0,0,0, 1,1, 2,2,2,2, 3])
durations    = np.array([3.1,2.8,3.4, 2.7,3.0, 4.2,3.9,4.5,4.1, 6.5])
n_hospitals  = 4

with pm.Model() as hierarchical_model:

    # --- Population-level hyperpriors ---
    mu_pop    = pm.Normal("mu_pop", mu=1.0, sigma=0.5)
    sigma_pop = pm.HalfNormal("sigma_pop", sigma=0.5)

    # --- Hospital-specific log-means (partial pooling) ---
    log_mu_h  = pm.Normal("log_mu_h", mu=mu_pop, sigma=sigma_pop,
                           shape=n_hospitals)
    obs_noise = pm.HalfNormal("obs_noise", sigma=0.5)

    # --- Likelihood (CRITICAL: must include observed= to connect to data) ---
    obs = pm.LogNormal("obs",
                       mu=log_mu_h[hospital_idx],   # hospital-specific
                       sigma=obs_noise,
                       observed=durations)

    # --- Derived: median duration per hospital ---
    median_h = pm.Deterministic("median_h", pm.math.exp(log_mu_h))

    idata_hier = pm.sample(draws=2000, tune=1000, chains=4,
                            target_accept=0.9, random_seed=42)

# Partial pooling in action: hospital 3 (only 1 patient, duration=6.5)
# is shrunk toward the population mean — more regularized than no-pooling
az.plot_forest(idata_hier, var_names=["median_h"],
               combined=True, hdi_prob=0.94)`;

const VI_CODE = `import pymc as pm
import numpy as np
import arviz as az

# When is Variational Inference (VI) useful?
# - Dataset has millions of rows (MCMC would take hours/days)
# - Exploring many models quickly before committing to MCMC
# - The posterior is approximately Normal (VI works best here)

with long_covid_model:
    # ADVI: Automatic Differentiation Variational Inference
    # Fits a multivariate Normal approximation to the posterior
    approx = pm.fit(
        n=50_000,          # number of optimization steps
        method="advi",     # alternatives: "fullrank_advi", "svgd"
        progressbar=True,
    )

# Draw samples from the VI approximation (much faster than MCMC)
vi_idata = approx.sample(5000)

# Compare VI vs MCMC: are the marginals similar?
import matplotlib.pyplot as plt
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
az.plot_posterior(idata,    var_names=["median_duration"],
                  ax=axes[0], title="MCMC (ground truth)")
az.plot_posterior(vi_idata, var_names=["median_duration"],
                  ax=axes[1], title="ADVI (approximation)")
plt.tight_layout()
plt.show()

# If the posteriors agree → VI is a valid shortcut for this model
# If they differ → the posterior is non-Normal, use MCMC`;

const MCMC_ALGOS = [
    { name: 'Metropolis-Hastings', sampler: 'pm.Metropolis()', use: 'Simple models, educational use', pro: 'Easy to understand', con: 'Very slow for high dimensions, low acceptance rate' },
    { name: 'Hamiltonian Monte Carlo (HMC)', sampler: 'pm.HamiltonianMC()', use: 'Smooth, differentiable posteriors', pro: 'Uses gradient info → much faster than MH', con: 'Requires manual step-size tuning' },
    { name: 'NUTS (No-U-Turn Sampler)', sampler: 'pm.NUTS() — default', use: 'General use — PyMC default', pro: 'Automatic tuning, excellent efficiency', con: 'Requires differentiable model (no discrete latents)' },
    { name: 'Sequential MC (SMC)', sampler: 'pm.sample_smc()', use: 'Multimodal posteriors, model evidence', pro: 'Handles multiple modes, computes marginal likelihood', con: 'Higher computational cost per sample' },
];

const UPDATE_SUMMARY_STYLES = {
    prior: {
        card: 'bg-blue-50/60 border-blue-100',
        label: 'text-blue-500',
        value: 'text-blue-800',
        sub: 'text-blue-400',
    },
    data: {
        card: 'bg-slate-50/60 border-slate-100',
        label: 'text-slate-500',
        value: 'text-slate-800',
        sub: 'text-slate-400',
    },
    posterior: {
        card: 'bg-indigo-50/60 border-indigo-100',
        label: 'text-indigo-500',
        value: 'text-indigo-800',
        sub: 'text-indigo-400',
    },
};

export function ChapterInference({ priorMu, priorSigma, dataMu, setDataMu, dataSigma, setDataSigma }: Props) {
    const [activeAlgo, setActiveAlgo] = useState(2);

    // Analytical conjugate update for Normal-Normal
    const prec0 = 1 / (priorSigma ** 2);
    const precD = 1 / (dataSigma ** 2);
    const posteriorSigma = Math.sqrt(1 / (prec0 + precD));
    const posteriorMu = posteriorSigma ** 2 * (prec0 * priorMu + precD * dataMu);

    return (
        <div className="space-y-16 pb-16">

            {/* 1. Bayesian Updating */}
            <section className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800">1. Bayesian Updating — Prior × Likelihood</h3>
                <p className="text-[17px] text-slate-600 leading-[1.85]">
                    When we observe data, Bayes' theorem combines the prior and likelihood to produce the
                    posterior. For Normal-Normal conjugate models the update is a <em>precision-weighted
                        average</em>. The posterior mean is pulled toward whichever distribution is narrower (more precise).
                    Low-precision data often means few observations, noisy measurements, or heterogeneous patients;
                    in that setting, the posterior should move cautiously instead of letting unreliable data dominate.
                </p>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <BlockMath math={`\\mu_{\\text{post}} = \\frac{\\mu_0/\\sigma_0^2 + \\bar{x}/\\sigma_D^2}{1/\\sigma_0^2 + 1/\\sigma_D^2}`} />
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        {[
                            { label: 'Prior Mean', val: priorMu.toFixed(2), sub: `σ₀ = ${priorSigma.toFixed(2)}`, styles: UPDATE_SUMMARY_STYLES.prior },
                            { label: 'Data Mean', val: dataMu.toFixed(2), sub: `σ_D = ${dataSigma.toFixed(2)}`, styles: UPDATE_SUMMARY_STYLES.data },
                            { label: 'Posterior Mean', val: posteriorMu.toFixed(2), sub: `σ = ${posteriorSigma.toFixed(3)}`, styles: UPDATE_SUMMARY_STYLES.posterior },
                        ].map(c => (
                            <div key={c.label} className={`p-4 rounded-xl border ${c.styles.card}`}>
                                <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${c.styles.label}`}>{c.label}</div>
                                <div className={`text-3xl font-bold tabular-nums ${c.styles.value}`}>{c.val}</div>
                                <div className={`text-xs font-mono mt-1 ${c.styles.sub}`}>{c.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Interactive update */}
            <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-xl font-bold text-slate-800">Interactive Posterior Update</h3>
                <p className="text-[15px] text-slate-600">
                    The posterior (indigo) is a precision-weighted compromise. When <InlineMath math="\sigma_D \to 0" /> (precise data),
                    the prior is overwhelmed and the posterior collapses onto the data mean.
                    When <InlineMath math="\sigma_D \gg \sigma_0" />, the posterior stays near the prior.
                    This is useful when data is sparse or noisy: the prior still updates, but it is not erased by
                    weak evidence.
                </p>
                <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm font-semibold text-slate-700">
                            <span>Data Mean (<InlineMath math="\bar{x}" />)</span>
                            <span className="font-mono bg-white px-2 py-0.5 rounded shadow-sm">{dataMu.toFixed(1)}</span>
                        </div>
                        <input type="range" min="-5" max="5" step="0.1" value={dataMu}
                            onChange={e => setDataMu(parseFloat(e.target.value))} className="w-full accent-slate-500" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm font-semibold text-slate-700">
                            <span>Data Uncertainty (<InlineMath math="\sigma_D" />)</span>
                            <span className="font-mono bg-white px-2 py-0.5 rounded shadow-sm">{dataSigma.toFixed(1)}</span>
                        </div>
                        <input type="range" min="0.2" max="3" step="0.1" value={dataSigma}
                            onChange={e => setDataSigma(parseFloat(e.target.value))} className="w-full accent-slate-400" />
                    </div>
                </div>
                <PosteriorUpdateVisualization priorMu={priorMu} priorSigma={priorSigma} dataMu={dataMu} dataSigma={dataSigma} />
            </section>

            {/* Workflow reminder */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                <Info className="shrink-0 text-blue-500 mt-0.5" size={16} />
                <p className="text-sm text-slate-600">
                    <strong>Bayesian workflow:</strong> Before running MCMC, generate data from the <strong>prior predictive distribution</strong> and
                    check it against domain knowledge. If the prior implies impossible values (e.g., negative durations), fix the
                    priors first. Only compute the posterior once the prior predictive looks reasonable.
                </p>
            </div>

            {/* 2. MCMC Algorithms */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">2. MCMC Algorithms Compared</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    Not all MCMC is the same. PyMC offers several samplers, each suited to different
                    posterior geometries. The default NUTS is almost always the right choice for
                    continuous differentiable parameters, but knowing the alternatives matters.
                </p>
                <div className="flex flex-wrap gap-2">
                    {MCMC_ALGOS.map((a, i) => (
                        <button key={a.name} onClick={() => setActiveAlgo(i)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeAlgo === i ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {a.name}
                        </button>
                    ))}
                </div>
                {MCMC_ALGOS[activeAlgo] && (
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">PyMC Sampler</div>
                            <div className="font-mono text-sm text-indigo-700">{MCMC_ALGOS[activeAlgo].sampler}</div>
                        </div>
                        <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div className="text-xs font-semibold text-emerald-600 uppercase mb-1">Advantage</div>
                            <div className="text-sm text-slate-700">{MCMC_ALGOS[activeAlgo].pro}</div>
                        </div>
                        <div className="p-5 rounded-xl bg-red-50 border border-red-100">
                            <div className="text-xs font-semibold text-red-500 uppercase mb-1">Limitation</div>
                            <div className="text-sm text-slate-700">{MCMC_ALGOS[activeAlgo].con}</div>
                        </div>
                    </div>
                )}
                <CodeBlock code={MCMC_CODE} title="PyMC – NUTS Sampling (complete, runnable)" />
                <div className="space-y-3">
                    <h4 className="text-lg font-bold text-slate-700">Interactive: Watch the MCMC Sampler Explore the Posterior</h4>
                    <p className="text-[15px] text-slate-500 leading-relaxed">
                        Click <strong>Run Sampler</strong> to see a Metropolis-Hastings chain explore the
                        joint posterior of <InlineMath math="(\log\mu, \sigma_{\text{obs}})" />. Tune the step
                        size to see how it affects mixing and acceptance rate — too small = slow exploration,
                        too large = high rejection rate.
                        We sample the whole posterior rather than only the highest point because uncertainty,
                        parameter correlations, and posterior predictive checks all depend on the full distribution.
                    </p>
                    <MCMCSamplingVisualizer />
                </div>
                <MCMCTraceViewer />
            </section>

            {/* 3. Reading the Posterior */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">3. Reading the Posterior Distribution</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    The posterior is richer than a p-value because it keeps the whole range of plausible values,
                    not only a yes/no test result. We summarize it using the
                    <strong> Highest Density Interval (HDI)</strong> — the narrowest interval containing
                    94% of posterior probability. Unlike a frequentist confidence interval, the HDI has
                    a direct probability statement: <em>"given our model and data, there is a 94%
                        probability the true parameter lies here."</em>
                </p>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="text-sm font-semibold text-slate-700">ArviZ Summary Table — Key Columns:</div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono">
                            <thead>
                                <tr className="bg-slate-50 border-b">
                                    {['Column', 'Meaning', 'Healthy threshold'].map(h => (
                                        <th key={h} className="p-3 text-left font-sans font-semibold text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {[
                                    { col: 'mean / sd', mean: 'Posterior mean and standard deviation', thr: 'N/A (data-dependent)' },
                                    { col: 'hdi_3% / hdi_97%', mean: '94% Highest Density Interval (narrowest 94% probability mass)', thr: 'Should not include implausible values' },
                                    { col: 'r_hat (R̂)', mean: 'Gelman-Rubin: within-chain vs between-chain variance', thr: '< 1.01 required · > 1.05 = failure' },
                                    { col: 'ess_bulk', mean: 'Effective sample size for bulk estimates (mean, HDI)', thr: '> 400 total minimum; more is better' },
                                    { col: 'ess_tail', mean: 'ESS for tail quantiles (5th / 95th percentile)', thr: '> 400 total minimum' },
                                ].map(r => (
                                    <tr key={r.col} className="bg-white hover:bg-slate-50">
                                        <td className="p-3 text-indigo-600 font-semibold">{r.col}</td>
                                        <td className="p-3 text-slate-600 font-sans">{r.mean}</td>
                                        <td className="p-3 text-emerald-700 font-sans">{r.thr}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl border border-red-100 bg-red-50/40">
                        <div className="font-bold text-red-800 text-sm mb-2">❌ Frequentist 95% Confidence Interval</div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            "If we repeated this experiment ∞ times and computed a CI each time,
                            95% of those intervals would contain the fixed true θ." The parameter is fixed; the interval is random.
                        </p>
                    </div>
                    <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                        <div className="font-bold text-emerald-800 text-sm mb-2">✅ Bayesian 94% HDI</div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            "Given our model and the observed data, there is a 94% probability that
                            the parameter lies in this interval." The parameter is a random variable; the HDI is its credible region.
                        </p>
                    </div>
                </div>
                <CodeBlock code={POSTERIOR_CODE} title="ArviZ – Visualising the Posterior" />
            </section>

            {/* 4. Hierarchical Modeling */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">4. Hierarchical Modeling (Partial Pooling)</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    Multi-level data (patients nested in hospitals) calls for a hierarchical model.
                    Estimating every hospital separately makes small hospitals noisy; forcing all hospitals to
                    share one estimate hides real differences.
                    Each hospital has a parameter <InlineMath math="\log\mu_h" /> drawn from a shared
                    population distribution <InlineMath math="\mathcal{N}(\mu_{\text{pop}}, \sigma_{\text{pop}})" />.
                    This is <strong>partial pooling</strong>: hospitals with little data borrow strength
                    from the population; hospitals with lots of data keep their own estimates.
                    The key assumption is exchangeability: hospitals are related enough to learn from a shared
                    distribution, but not identical.
                </p>
                <HierarchicalModelingVisual />
                <CodeBlock code={HIER_CODE} title="PyMC – Complete Hierarchical Model (runnable)" />
            </section>

            {/* 5. Variational Inference */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">5. Variational Inference — Fast MCMC Alternative</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    When the dataset is too large for MCMC (millions of rows) or you need fast model
                    exploration, <strong>Variational Inference (VI)</strong> recasts inference as
                    an <em>optimization problem</em>. It finds the closest member of a tractable
                    distribution family (usually <InlineMath math="\mathcal{N}" />) to the true posterior
                    by minimizing the <strong>KL divergence</strong>:
                </p>
                <BlockMath math={`q^*(\\theta) = \\argmin_{q \\in \\mathcal{Q}}\\; \\text{KL}\\!\\left[q(\\theta) \\,\\|\\, p(\\theta|D)\\right]`} />
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                    {[
                        { label: 'ADVI', desc: 'Mean-field VI — assumes independent posteriors per parameter. Fastest but may underestimate uncertainty.', tag: 'Most used' },
                        { label: 'FullRank ADVI', desc: 'Captures correlations between parameters. More accurate than ADVI, slower.', tag: 'Better fit' },
                        { label: 'SVGD', desc: 'Stein Variational Gradient Descent — non-parametric, can capture multimodality.', tag: 'Experimental' },
                    ].map(v => (
                        <div key={v.label} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-slate-800">{v.label}</span>
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{v.tag}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{v.desc}</p>
                        </div>
                    ))}
                </div>
                <CodeBlock code={VI_CODE} title="PyMC – ADVI Variational Inference vs MCMC" />
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                    <Info className="shrink-0 text-amber-500 mt-0.5" size={16} />
                    <p className="text-sm text-slate-600">
                        <strong>Rule of thumb:</strong> always validate VI against MCMC on a small subset before trusting
                        VI posteriors on the full dataset. VI can systematically underestimate posterior variance
                        (especially for hierarchical models).
                    </p>
                </div>
            </section>

        </div>
    );
}
