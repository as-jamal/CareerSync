/* ==========================================================================
   HIREMIND AI — Client-Side Logic & Dynamic Dashboard Controller
   ========================================================================== */

let selectedFile = null;
let currentAnalysisData = null;
let activeInterviewTab = 'technical';

document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
});

/* --------------------------------------------------------------------------
   MODE SWITCHING (Single Match vs Recruiter Mode)
   -------------------------------------------------------------------------- */
function switchMode(mode) {
    const candBtn = document.getElementById('tab-candidate-btn');
    const recBtn = document.getElementById('tab-recruiter-btn');
    const candView = document.getElementById('candidate-mode-view');
    const recView = document.getElementById('recruiter-mode-view');

    if (mode === 'candidate') {
        candBtn.classList.add('active');
        recBtn.classList.remove('active');
        candView.style.display = 'block';
        recView.style.display = 'none';
    } else {
        recBtn.classList.add('active');
        candBtn.classList.remove('active');
        recView.style.display = 'block';
        candView.style.display = 'none';
    }
}

/* --------------------------------------------------------------------------
   DRAG & DROP / FILE INPUT HANDLERS
   -------------------------------------------------------------------------- */
function setupDragAndDrop() {
    const zone = document.getElementById('upload-zone');
    if (!zone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('dragover');
        }, false);
    });

    zone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleFileSelect({ target: { files: files } });
        }
    });
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
        selectedFile = files[0];
        const fileName = selectedFile.name;
        document.getElementById('file-name-display').innerText = fileName;
        document.getElementById('file-details').style.display = 'inline-flex';
        showToast(`Selected file: ${fileName}`, 'success');
    }
}

function removeFile(event) {
    if (event) event.stopPropagation();
    selectedFile = null;
    document.getElementById('resume-file-input').value = '';
    document.getElementById('file-details').style.display = 'none';
    showToast('Removed file.', 'info');
}

function togglePasteResume() {
    const wrapper = document.getElementById('paste-resume-wrapper');
    if (wrapper.style.display === 'none') {
        wrapper.style.display = 'block';
    } else {
        wrapper.style.display = 'none';
    }
}

/* --------------------------------------------------------------------------
   SAMPLE JOB LOADER
   -------------------------------------------------------------------------- */
function loadSampleJob() {
    const sampleJobText = `Job Title: Python Backend Developer
Company: Apex Innovations

Key Responsibilities:
- Design and develop RESTful APIs using Python and Flask / Django.
- Manage SQL database schemas, write complex queries, and optimize performance.
- Containerize services using Docker and orchestrate deployments on AWS cloud infrastructure.
- Maintain clean code quality, unit tests, and version control using Git.

Requirements:
- 1-3 years experience with Python web development.
- Strong knowledge of relational databases (PostgreSQL / MySQL / SQL).
- Hands-on experience with REST APIs and Flask or Django framework.
- Experience with Docker containerization and AWS cloud services.
- Familiarity with HTML, CSS, JavaScript, and Git workflows.`;

    document.getElementById('job-description-input').value = sampleJobText;
    showToast('Loaded sample job description.', 'success');
}

/* --------------------------------------------------------------------------
   MAIN ANALYSIS INITIATION
   -------------------------------------------------------------------------- */
async function startAnalysis() {
    const jobText = document.getElementById('job-description-input').value.trim();
    const pastedResume = document.getElementById('resume-text-input').value.trim();

    if (!selectedFile && !pastedResume) {
        showToast('Please upload a resume (PDF/DOCX/TXT) or paste your resume text.', 'error');
        return;
    }

    if (!jobText) {
        showToast('Please enter or paste the target Job Description.', 'error');
        return;
    }

    // Prepare FormData payload
    const formData = new FormData();
    if (selectedFile) {
        formData.append('resume', selectedFile);
    } else {
        formData.append('resume_text', pastedResume);
    }
    formData.append('job_description', jobText);

    // Show Loading Card
    showLoadingState(true);

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        showLoadingState(false);

        if (result.success) {
            currentAnalysisData = result.data;
            renderDashboard(result.data, result.filename);
            showToast('Analysis completed successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to analyze resume.', 'error');
        }
    } catch (err) {
        showLoadingState(false);
        showToast('Network error or server unavailable. Please try again.', 'error');
        console.error(err);
    }
}

/* --------------------------------------------------------------------------
   LOADING STATE ANIMATION & MESSAGES
   -------------------------------------------------------------------------- */
function showLoadingState(isLoading) {
    const loadingCard = document.getElementById('loading-card');
    const resultsDash = document.getElementById('results-dashboard');
    const analyzeBtn = document.getElementById('analyze-btn');
    const stepText = document.getElementById('loading-step-text');
    const fillBar = document.getElementById('loading-progress-fill');

    if (isLoading) {
        loadingCard.style.display = 'block';
        resultsDash.style.display = 'none';
        analyzeBtn.disabled = true;

        const steps = [
            "Parsing structural resume content & credentials...",
            "Extracting candidate skill matrix & project history...",
            "Analyzing target job requirements & expectations...",
            "Performing AI Agent semantic match & gap calculation...",
            "Generating personalized career roadmap & interview prep..."
        ];

        let curStep = 0;
        fillBar.style.width = '10%';
        stepText.innerText = steps[0];

        window.loadingInterval = setInterval(() => {
            curStep++;
            if (curStep < steps.length) {
                stepText.innerText = steps[curStep];
                fillBar.style.width = `${((curStep + 1) / steps.length) * 90}%`;
            }
        }, 800);

    } else {
        clearInterval(window.loadingInterval);
        loadingCard.style.display = 'none';
        analyzeBtn.disabled = false;
        fillBar.style.width = '100%';
    }
}

/* --------------------------------------------------------------------------
   RENDER DASHBOARD DATA
   -------------------------------------------------------------------------- */
function renderDashboard(data, filename) {
    document.getElementById('results-dashboard').style.display = 'block';

    // Scroll smoothly to results
    document.getElementById('results-dashboard').scrollIntoView({ behavior: 'smooth' });

    // 1. Render Gauge Score & Count-up animation
    const overallScore = data.overall_match_score || 0;
    const matchLabel = data.match_label || 'Evaluated';
    
    animateScoreGauge(overallScore, data.status_color || '#10b981');
    document.getElementById('overall-match-label').innerText = matchLabel;

    // 2. Render Subscores
    setSubscore('skills-score-val', 'skills-meter', data.skills_match_score || 0);
    setSubscore('exp-score-val', 'exp-meter', data.experience_match_score || 0);
    setSubscore('edu-score-val', 'edu-meter', data.education_match_score || 0);
    setSubscore('rel-score-val', 'rel-meter', data.relevance_match_score || 80);

    // 3. Render Matching Skills Tags
    const matchingCloud = document.getElementById('matching-skills-cloud');
    matchingCloud.innerHTML = '';
    const matchingList = data.matching_skills || [];
    document.getElementById('matching-skills-count').innerText = `${matchingList.length} Skills`;

    if (matchingList.length === 0) {
        matchingCloud.innerHTML = '<span class="text-muted">No explicit matching skills found.</span>';
    } else {
        matchingList.forEach(sk => {
            const tag = document.createElement('span');
            tag.className = 'tag-badge';
            tag.innerHTML = `<i class="fa-solid fa-check"></i> ${sk}`;
            matchingCloud.appendChild(tag);
        });
    }

    // 4. Render Missing Skills / Skill Gaps
    const missingListContainer = document.getElementById('missing-skills-list');
    missingListContainer.innerHTML = '';
    const missingList = data.missing_skills || [];
    document.getElementById('missing-skills-count').innerText = `${missingList.length} Gaps`;

    if (missingList.length === 0) {
        missingListContainer.innerHTML = '<p style="font-size: 13px; color: #34d399;"><i class="fa-solid fa-circle-check"></i> No critical missing skills detected for this role!</p>';
    } else {
        missingList.forEach(item => {
            const skillName = typeof item === 'string' ? item : item.skill;
            const prio = typeof item === 'object' && item.priority ? item.priority : 'MEDIUM';
            const reason = typeof item === 'object' && item.reason ? item.reason : 'Required in job description.';

            const gapCard = document.createElement('div');
            gapCard.className = 'gap-item';
            gapCard.innerHTML = `
                <div class="gap-header">
                    <span class="gap-title"><i class="fa-solid fa-triangle-exclamation"></i> ${skillName}</span>
                    <span class="prio-badge prio-${prio}">${prio} PRIORITY</span>
                </div>
                <p class="gap-reason">${reason}</p>
            `;
            missingListContainer.appendChild(gapCard);
        });
    }

    // 5. Render Strengths List
    const strengthsListUl = document.getElementById('strengths-list');
    strengthsListUl.innerHTML = '';
    (data.strengths || []).forEach(st => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fa-solid fa-star"></i> <span>${st}</span>`;
        strengthsListUl.appendChild(li);
    });

    // 6. Render AI Reasoning Summary
    document.getElementById('ai-summary-text').innerText = data.ai_summary || 'Candidate exhibits strong core qualifications matching key job duties.';

    // 7. Render Skill Gap Visualization Progress Bars
    const visContainer = document.getElementById('skill-vis-container');
    visContainer.innerHTML = '';
    (data.skill_gap_analysis || []).forEach(item => {
        const row = document.createElement('div');
        row.className = 'vis-item';
        const isMissing = item.status === 'missing' || item.candidate_level < 40;
        const icon = isMissing ? '<i class="fa-solid fa-triangle-exclamation icon-warning"></i>' : '<i class="fa-solid fa-circle-check icon-success"></i>';
        
        row.innerHTML = `
            <span class="vis-name">${item.skill}</span>
            <div class="vis-track">
                <div class="vis-fill ${isMissing ? 'missing' : ''}" style="width: ${item.candidate_level}%"></div>
            </div>
            <span class="vis-pct">${item.candidate_level}%</span>
            <span>${icon}</span>
        `;
        visContainer.appendChild(row);
    });

    // 8. Render Career Roadmap Timeline
    const timeline = document.getElementById('roadmap-timeline');
    timeline.innerHTML = '';
    (data.career_roadmap || []).forEach((stepObj, idx) => {
        const stepNum = stepObj.step || (idx + 1);
        const title = stepObj.title || `Step ${stepNum}`;
        const action = stepObj.action || '';

        const item = document.createElement('div');
        item.className = 'timeline-step';
        item.innerHTML = `
            <div class="timeline-node">${stepNum}</div>
            <div class="timeline-content">
                <h4 class="timeline-title">${title}</h4>
                <p class="timeline-action">${action}</p>
            </div>
        `;
        timeline.appendChild(item);
    });

    // 9. Render ATS Section
    const atsScore = data.ats_score || 80;
    document.getElementById('ats-score-val').innerText = atsScore;

    const atsStrUl = document.getElementById('ats-strengths-list');
    atsStrUl.innerHTML = '';
    (data.ats_strengths || []).forEach(st => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fa-solid fa-check icon-success"></i> ${st}`;
        atsStrUl.appendChild(li);
    });

    const atsImpUl = document.getElementById('ats-improvements-list');
    atsImpUl.innerHTML = '';
    (data.ats_improvements || []).forEach(imp => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fa-solid fa-triangle-exclamation icon-warning"></i> ${imp}`;
        atsImpUl.appendChild(li);
    });
}

function setSubscore(valId, meterId, val) {
    document.getElementById(valId).innerText = `${val}%`;
    setTimeout(() => {
        document.getElementById(meterId).style.width = `${val}%`;
    }, 100);
}

/* Gauge Animation */
function animateScoreGauge(targetScore, color) {
    const circle = document.getElementById('gauge-fill-circle');
    const scoreValElem = document.getElementById('overall-score-value');
    
    // Circumference = 2 * PI * r = 2 * 3.14159 * 42 = 263.89
    const maxOffset = 264;
    const offset = maxOffset - (maxOffset * targetScore / 100);

    circle.style.stroke = color;
    circle.style.strokeDashoffset = offset;

    // Animated count up
    let startVal = 0;
    const duration = 1200;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = targetScore / steps;

    const timer = setInterval(() => {
        startVal += increment;
        if (startVal >= targetScore) {
            scoreValElem.innerText = `${targetScore}%`;
            clearInterval(timer);
        } else {
            scoreValElem.innerText = `${Math.round(startVal)}%`;
        }
    }, stepTime);
}

/* --------------------------------------------------------------------------
   INTERVIEW PREPARATION MODAL LOGIC
   -------------------------------------------------------------------------- */
function openInterviewModal() {
    if (!currentAnalysisData || !currentAnalysisData.interview_questions) {
        showToast('Please analyze a resume first to generate interview questions.', 'warning');
        return;
    }
    document.getElementById('interview-modal').style.display = 'flex';
    switchInterviewCategory('technical');
}

function closeInterviewModal() {
    document.getElementById('interview-modal').style.display = 'none';
}

function switchInterviewCategory(cat) {
    activeInterviewTab = cat;
    const tabs = document.querySelectorAll('.int-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    const container = document.getElementById('interview-questions-container');
    container.innerHTML = '';

    const qDict = currentAnalysisData.interview_questions || {};
    const questions = qDict[cat] || ["What are your primary technical strengths for this position?"];

    questions.forEach((q, idx) => {
        const qBox = document.createElement('div');
        qBox.className = 'q-item';
        qBox.innerHTML = `<p><strong>Q${idx + 1}:</strong> ${q}</p>`;
        container.appendChild(qBox);
    });
}

/* --------------------------------------------------------------------------
   RECRUITER MODE BATCH ANALYSIS
   -------------------------------------------------------------------------- */
async function startRecruiterAnalysis() {
    const filesInput = document.getElementById('recruiter-files-input');
    const jobText = document.getElementById('recruiter-job-input').value.trim();

    if (!filesInput.files || filesInput.files.length < 2) {
        showToast('Please select at least 2 candidate resume files for ranking.', 'warning');
        return;
    }
    if (!jobText) {
        showToast('Please enter the target job description.', 'warning');
        return;
    }

    const formData = new FormData();
    for (let i = 0; i < filesInput.files.length; i++) {
        formData.append('resumes', filesInput.files[i]);
    }
    formData.append('job_description', jobText);

    showToast('Evaluating & ranking candidates...', 'info');

    try {
        const response = await fetch('/api/recruiter-analyze', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            renderRecruiterLeaderboard(result.candidates);
            showToast('Candidate ranking completed!', 'success');
        } else {
            showToast(result.error || 'Recruiter ranking failed.', 'error');
        }
    } catch (err) {
        showToast('Error connecting to server.', 'error');
        console.error(err);
    }
}

function renderRecruiterLeaderboard(candidates) {
    const tableBody = document.getElementById('recruiter-table-body');
    const resultsContainer = document.getElementById('recruiter-results');
    document.getElementById('recruiter-cand-count').innerText = `${candidates.length} Candidates`;

    tableBody.innerHTML = '';

    candidates.forEach((cand, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${idx + 1}</strong></td>
            <td><strong>${cand.name}</strong></td>
            <td class="text-muted">${cand.filename}</td>
            <td><span class="badge-count" style="background: rgba(99,102,241,0.2); color:#a5b4fc;">${cand.overall_score}%</span></td>
            <td><span style="color:${cand.status_color}; font-weight:700;">${cand.match_label}</span></td>
            <td>
                <button class="btn btn-xs btn-primary" onclick="inspectCandidateReport(${idx})">View Report</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    resultsContainer.style.display = 'block';
    window.recruiterCandidatesCache = candidates;
}

function inspectCandidateReport(index) {
    const cand = window.recruiterCandidatesCache[index];
    if (!cand) return;

    switchMode('candidate');
    currentAnalysisData = cand.analysis;
    renderDashboard(cand.analysis, cand.filename);
    showToast(`Loaded full report for ${cand.name}`, 'info');
}

/* --------------------------------------------------------------------------
   HACKATHON ONE-CLICK DEMO MODE
   -------------------------------------------------------------------------- */
async function loadDemoData() {
    showToast('Loading pre-configured hackathon demo dataset...', 'info');

    try {
        const response = await fetch('/api/demo-data');
        const result = await response.json();

        if (result.success) {
            switchMode('candidate');
            
            document.getElementById('job-description-input').value = result.sample_job;
            document.getElementById('resume-text-input').value = result.sample_resume;
            document.getElementById('paste-resume-wrapper').style.display = 'block';

            currentAnalysisData = result.data;
            renderDashboard(result.data, result.filename);
            showToast('⚡ Demo mode dataset active!', 'success');
        } else {
            showToast('Could not load demo dataset.', 'error');
        }
    } catch (err) {
        showToast('Failed to contact demo server.', 'error');
        console.error(err);
    }
}

/* --------------------------------------------------------------------------
   TOAST NOTIFICATION CONTROLLER
   -------------------------------------------------------------------------- */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
