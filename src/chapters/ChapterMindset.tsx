import { Info, RefreshCw, GitBranch, BarChart2, CheckSquare } from 'lucide-react';
import { InlineMath, BlockMath } from '../components/Maths';
import { CodeBlock } from '../components/CodeBlock';
import { BetaBinomialUpdater } from '../components/BetaBinomialUpdater';

const BAYES_THEOREM_FORMULA = `P(\\theta \\mid D, M) = \\frac{P(D \\mid \\theta, M)\\; P(\\theta)}{P(D \\mid M)}`;
const EVIDENCE_INTEGRAL = `P(D \\mid M) = \\int P(D \\mid \\theta, M)\\; P(\\theta)\\; d\\theta`;
const CONJUGATE_NORMAL_MU = `\\mu_{\\text{post}} = \\frac{\\mu_0/\\sigma_0^2 + n\\bar{x}/\\sigma^2}{1/\\sigma_0^2 + n/\\sigma^2}`;
const CONJUGATE_NORMAL_SIGMA = `\\frac{1}{\\sigma_{\\text{post}}^2} = \\frac{1}{\\sigma_0^2} + \\frac{n}{\\sigma^2}`;

const CONJUGATE_SIM_CODE = `import numpy as np

# True parameters
true_mu = 3.2
true_sigma = 1.0

# Prior: mu ~ Normal(mu0=0, sigma0=5)
mu_0, sigma_0 = 0.0, 5.0

# Observe n=20 data points
rng = np.random.default_rng(42)
data = rng.normal(loc=true_mu, scale=true_sigma, size=20)
n, x_bar = len(data), data.mean()

# Conjugate Normal-Normal posterior update (closed form):
# 1/sigma_post^2 = 1/sigma_0^2 + n/sigma^2
sigma_post_sq = 1.0 / (1/sigma_0**2 + n/true_sigma**2)
sigma_post = np.sqrt(sigma_post_sq)

# mu_post = sigma_post^2 * (mu_0/sigma_0^2 + n*x_bar/sigma^2)
mu_post = sigma_post_sq * (mu_0/sigma_0**2 + n*x_bar/true_sigma**2)

print(f"Posterior:  mu = {mu_post:.3f},  sigma = {sigma_post:.3f}")
print(f"True value: mu = {true_mu}")
# Posterior:  mu = 3.170,  sigma = 0.222
# Notice: even with a vague prior (sigma_0=5), 20 data points pull
# the posterior very close to the true value.`;

const CONJUGATE_TABLE = [
    { prior: 'Beta(α, β)', likelihood: 'Bernoulli(p)', posterior: 'Beta(α + successes, β + failures)', use: 'Clinical trial recovery rate' },
    { prior: 'Normal(μ₀, σ₀)', likelihood: 'Normal(μ, σ²) — known σ', posterior: 'Normal(μ_post, σ_post)', use: 'Estimating mean duration (our case)' },
    { prior: 'Gamma(α, β)', likelihood: 'Poisson(λ)', posterior: 'Gamma(α + Σx, β + n)', use: 'Admission rate at hospitals' },
    { prior: 'Dirichlet(α)', likelihood: 'Categorical(p)', posterior: 'Dirichlet(α + counts)', use: 'Symptom category frequencies' },
];

export function ChapterMindset() {
    return (
        <div className="space-y-16 pb-16">

            {/* Intro */}
            <section className="space-y-5">
                <h3 className="text-2xl font-bold text-slate-800">About this website</h3>
                <p className="text-[17px] text-slate-600 leading-[1.85]">
                    This guide is designed to give a practical, intuitive introduction to Bayesian inference and the Bayesian workflow. 
                    The following pages will walk you through the main steps of a Bayesian workflow, from defining a model to fitting it with MCMC and checking its predictions.
                    For every step of the process, there will be interactive elements to help you build intuition for working with priors, posteriors, and likelihoods.
                </p>
                <div className="p-5 bg-indigo-50/80 rounded-xl border border-indigo-100 text-slate-700 text-[15px] leading-relaxed">
                    <strong>Working example:</strong> To explain the Bayesian workflow, we will model Long-Covid symptom durations. 
                </div>
            </section>
            <section className="space-y-5">
                <h3 className="text-2xl font-bold text-slate-800">What is Bayesian Inference?</h3>
                <p className="text-[17px] text-slate-600 leading-[1.85]">
                    Bayesian inference describes the process of fitting a probability model to a set of data 
                    and summarizing the result by a probability distribution on the parameters of the model.
                    The great advantage of Bayesian inference over frequentist methods is that it provides a 
                    coherent framework for reasoning about uncertainty. 
                    While frequentist methods produce point estimates and p-values, Bayesian inference produces a full
                    <strong>posterior distribution</strong> over every unknown parameter, reflecting our uncertainty 
                    about the parameter values given the data and prior knowledge.
                </p>
                <div className="p-5 bg-indigo-50/80 rounded-xl border border-indigo-100 text-slate-700 text-[15px] leading-relaxed">
                    <strong>Core insight:</strong> Bayesian inference is about consistently applying the
                    rules of probability to update beliefs. A prior encodes what we know before seeing data;
                    the likelihood shows how well each parameter value explains the data; and the
                    posterior combines both — it is the logically optimal update given our model.
                </div>
            </section>

            {/* Bayes Theorem */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">The Bayes Theorem</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    The mathematical foundation of Bayesian inference is the Bayes theorem. 
                    In the following, θ are the parameters we want to learn. D is the observed data. Every term is conditioned on our model M.
                </p>
                 <div className="p-5 bg-indigo-50/80 rounded-xl border border-indigo-100 text-slate-700 text-[15px] leading-relaxed">
                    <strong>Reading the formula:</strong> P denotes a probability. During Bayesian modeling, this always refers to a probability distribution, not a singular value.  E.g. P(θ) is read as "probability of θ" 
                    The vertical bar "|" is read as "given" or "conditional on".
                </div>
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
                    <BlockMath math={BAYES_THEOREM_FORMULA} />
                    <div className="grid md:grid-cols-4 gap-4 text-center text-sm">
                        {[
                            { term: 'P(θ | D, M)', name: 'Posterior', color: 'black', desc: 'The probability of our parameters θ given the observed data D and model M' },
                            { term: 'P(D | θ, M)', name: 'Likelihood', color: 'black', desc: 'How probable is D given a specific value of θ and model M?' },
                            { term: 'P(θ | M)', name: 'Prior', color: 'black', desc: 'Our initial belief about θ before any data, given model M' },
                            { term: 'P(D | M)', name: 'Evidence', color: 'gray', desc: 'Normalizing constant — the probability of D under all possible θ and model M' },
                        ].map(c => (
                            <div key={c.name} className={`p-4 rounded-xl bg-${c.color}-50/80 border border-${c.color}-100`}>
                                <div className={`font-mono text-xs mb-2 text-${c.color}-400`}>{c.term}</div>
                                <div className={`font-bold text-${c.color}-800`}>{c.name}</div>
                                <div className={`text-xs text-${c.color}-600/80 mt-2 leading-relaxed`}>{c.desc}</div>
                            </div>
                        ))}
                    </div>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    <strong>Prior P(θ | M):</strong> Our initial belief about the parameters before seeing any data, given the model M. This can be based on previous studies, expert knowledge, or be intentionally vague.
                </p>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    <strong>Likelihood P(D | θ, M):</strong> The probability of observing the data D given specific parameter values θ and model M. This encodes how well the model explains the data for each θ.
                </p>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                     <strong>Evidence P(D | M):</strong> The total probability of the data under the model, integrating over all possible parameter values. This acts as a normalizing constant to ensure the posterior is a valid probability distribution.
                </p>
                 <p className="text-[16px] text-slate-600 leading-relaxed">
                     <strong>Posterior P(θ | D, M):</strong> Our updated belief about the parameters θ after seeing data D, given the model M. This is what we want to compute.
                </p>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                The denominator P(D | M) —
                    the <em>evidence</em> or <em>marginal likelihood</em> — is what makes exact Bayesian
                    inference intractable for most real problems.
                </p>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                        <div className="text-sm font-semibold text-amber-800">Why is P(D | M) intractable?</div>
                        <BlockMath math={EVIDENCE_INTEGRAL} />
                        <p className="text-sm text-slate-600 leading-relaxed">
                            This requires integrating over <em>all possible values of θ</em> — a high-dimensional
                            integral that has no closed form for most models. MCMC bypasses this entirely by
                            sampling proportional to <InlineMath math="P(D|\theta) \cdot P(\theta)" />, never
                            computing <InlineMath math="P(D)" /> explicitly.
                        </p>
                    </div>
                </div>
            </section>

            {/* Interactive: Beta-Binomial Updater */}
            <section className="space-y-5 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">Interactive: Posterior Updating in Action</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    In the following, you can interactively see how the posterior distribution updates as you observe new data points.
                    Before adding data, the posterior equals the prior. As you add data, the posterior shifts towards parameter values that better explain the observed data.
                    Depending on how wide your prior is, it may take more or fewer data points for the posterior to concentrate around the true value. 
                </p>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    Play around with different priors and data sequences to see how the Bayesian update works in practice!
                </p>
                <BetaBinomialUpdater />
            </section>

            {/* Bayesian vs Frequentist */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">Bayesian vs. Frequentist Thinking</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    These are two philosophically distinct frameworks. Neither is universally superior —
                    they answer fundamentally different questions.
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left p-4 font-semibold text-slate-600 w-1/4">Concept</th>
                                <th className="text-left p-4 font-semibold text-blue-600">Frequentist</th>
                                <th className="text-left p-4 font-semibold text-indigo-600">Bayesian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {[
                                { concept: 'Probability', freq: 'Long-run frequency in repeated experiments', bayes: 'Degree of belief, quantified in [0, 1]' },
                                { concept: 'Parameters', freq: 'Fixed unknown constants — not random variables', bayes: 'Random variables with probability distributions' },
                                { concept: 'Output', freq: 'Point estimate + confidence interval + p-value', bayes: 'Full posterior distribution' },
                                { concept: 'Prior knowledge', freq: 'Not incorporated (or via regularization, ad-hoc)', bayes: 'Explicitly encoded in the prior P(θ)' },
                                { concept: 'Small samples', freq: 'Relies on asymptotic (large n) guarantees', bayes: 'Principled uncertainty even with n < 20' },
                                { concept: 'Interval meaning', freq: '"95% of intervals computed this way contain θ"', bayes: '"P(θ ∈ HDI | data) = 94%"' },
                            ].map((r, i) => (
                                <tr key={r.concept} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                    <td className="p-4 font-semibold text-slate-700">{r.concept}</td>
                                    <td className="p-4 text-slate-500 text-[13.5px]">{r.freq}</td>
                                    <td className="p-4 text-slate-500 text-[13.5px]">{r.bayes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Generative Model */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">Bayesian models are generative</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    Bayesian models are <strong>generative</strong>: they describe a forward process for
                    how data is created. You can always <em>simulate</em> data from a generative model
                    by sampling parameters from the prior and then sampling data from the likelihood.
                    This is the key to <strong>Prior Predictive Checks</strong> — you simulate whole
                    datasets <em>before</em> seeing any real data to verify the model is scientifically sane.
                </p>
            </section>

            {/* Conjugate Priors */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">Conjugate Priors — When Math Works Out</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    A <strong>conjugate prior</strong> is one where the prior and posterior belong to the
                    same distribution family. When a conjugate pair exists, the posterior update has a
                    simple closed-form expression — no MCMC needed. For the Normal-Normal case with known
                    likelihood variance:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                        <div className="text-sm font-semibold text-slate-700">Posterior precision (reciprocal variance):</div>
                        <BlockMath math={CONJUGATE_NORMAL_SIGMA} />
                        <p className="text-xs text-slate-500 leading-relaxed">The posterior precision is the sum of prior precision and data precision.</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                        <div className="text-sm font-semibold text-slate-700">Posterior mean (precision-weighted average):</div>
                        <BlockMath math={CONJUGATE_NORMAL_MU} />
                        <p className="text-xs text-slate-500 leading-relaxed">The posterior mean is a weighted average of prior mean and sample mean.</p>
                    </div>
                </div>
                <CodeBlock code={CONJUGATE_SIM_CODE} title="Python – Normal-Normal Conjugate Update (Closed Form)" />
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b">
                                <th className="p-3 text-left font-semibold text-slate-600">Prior</th>
                                <th className="p-3 text-left font-semibold text-slate-600">Likelihood</th>
                                <th className="p-3 text-left font-semibold text-slate-600">Posterior</th>
                                <th className="p-3 text-left font-semibold text-slate-600">Use case</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {CONJUGATE_TABLE.map((r, i) => (
                                <tr key={r.prior} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                    <td className="p-3 font-mono text-blue-700">{r.prior}</td>
                                    <td className="p-3 font-mono text-amber-700">{r.likelihood}</td>
                                    <td className="p-3 font-mono text-emerald-700">{r.posterior}</td>
                                    <td className="p-3 text-slate-500">{r.use}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex gap-3">
                    <Info className="shrink-0 text-slate-400 mt-0.5" size={16} />
                    <p className="text-sm text-slate-600">
                        Real models rarely have conjugate forms — parameters interact, likelihoods
                        are non-standard, and models are hierarchical. That is why we use MCMC in
                        PyMC. But understanding conjugate updates builds intuition for what MCMC
                        is approximating.
                    </p>
                </div>
            </section>

            {/* Workflow Loop */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-2xl font-bold text-slate-800">The Bayesian Workflow Loop</h3>
                <p className="text-[16px] text-slate-600 leading-relaxed">
                    Bayesian modeling is an iterative process, not a single step. Based on Gelman,
                    Vehtari et al. (2020), the workflow cycles through four stages until the model
                    adequately explains the data.
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: GitBranch, color: 'black', label: '1. Define Model', desc: 'Specify priors and likelihood based on domain knowledge. Priors are hypotheses, not arbitrary choices.' },
                        { icon: BarChart2, color: 'black', label: '2. Prior Predictive', desc: 'Simulate data from the prior alone. Check that generated data is scientifically plausible.' },
                        { icon: RefreshCw, color: 'black', label: '3. Fit & Diagnose', desc: 'Run MCMC. Check R̂ < 1.01, ESS > 400, no divergences. Only proceed if diagnostics pass.' },
                        { icon: CheckSquare, color: 'black', label: '4. Posterior Predictive', desc: 'Simulate from the posterior. Does the model replicate real data patterns? If not, revise.' },
                    ].map(({ icon: Icon, color, label, desc }) => (
                        <div key={label} className={`p-5 rounded-xl bg-${color}-50/70 border border-${color}-100`}>
                            <Icon className={`text-${color}-500 mb-3`} size={20} />
                            <div className={`font-bold text-${color}-800 text-sm mb-2`}>{label}</div>
                            <div className={`text-xs text-${color}-700/80 leading-relaxed`}>{desc}</div>
                        </div>
                    ))}
                </div>
            </section>
            
            <section className="space-y-5">
                <h3 className="text-2xl font-bold text-slate-800">Additional resources</h3>
                <p className="text-[17px] text-slate-600 leading-[1.85]">
                This website is supposed to provide a short overview with interactive elements to get an intuitive understanding of concepts relevant for Bayesian inference. It is not supposed to be a full coursebook or in-depth instruction manual. If you want to go deeper, here are some resources:
                </p>
                <ul>
                    <li>Bayesian Statistics Course (with PyMC examples), <a href="https://areding.github.io/6420-pymc/intro.html">link</a></li>
                    <li>"Bayesian Methods for Hackers" (online book with PyMC examples) <a href="https://github.com/CamDavidsonPilon/Probabilistic-Programming-and-Bayesian-Methods-for-Hackers">on Github</a></li>
                    <li>"Bayesian Workflow" by Gelman, Vehtari et al. (2020), <a href="https://arxiv.org/abs/2011.01808">link</a></li>
                    <li>PyMC Documentation, <a href="https://www.pymc.io/projects/docs/en/stable/">link</a></li>
                    <li>Arviz Package for diagnostics and visualization of Bayesian models, <a href="https://python.arviz.org/en/stable/">link</a></li>
                </ul>
                
            </section>

            <section className="space-y-5">
                <h3 className="text-2xl font-bold text-slate-800">Credits</h3>
                <p className="text-[17px] text-slate-600 leading-[1.85]">
                The source code for this website is available on <a href="https://github.com/Amirreza-0/bayesian-playground">GitHub</a>.
                </p>
                <p className="text-[17px] text-slate-600 leading-[1.85]">
                Information found on this website is based on the sources mentioned in Additional Resources, as well as the author's own experience with Bayesian inference and PyMC. 
                </p>
                
            </section>
        </div>

    );
}

