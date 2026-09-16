import os
import sys
import uuid
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from services.resume_parser import ResumeParser
from services.ai_matcher import AIMatcher

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'hiremind_default_secret_key_2026')
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB limit
app.config['ALLOWED_EXTENSIONS'] = {'.pdf', '.docx', '.txt'}

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ai_matcher = AIMatcher()

def allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    """Renders the main HireMind AI Hackathon Dashboard."""
    api_ready = ai_matcher.is_api_configured()
    return render_template('index.html', api_configured=api_ready)

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Primary API Endpoint: Accepts Resume file (or raw text) + Job Description text,
    parses text, runs AI Agent evaluation, and returns structured analysis JSON.
    """
    try:
        job_description = request.form.get('job_description', '').strip()
        if not job_description:
            return jsonify({
                "success": False,
                "error": "Job Description is required. Please paste or enter target job requirements."
            }), 400

        resume_text = ""
        filename_used = ""

        # Check if file was uploaded
        if 'resume' in request.files and request.files['resume'].filename != '':
            file = request.files['resume']
            
            if not allowed_file(file.filename):
                return jsonify({
                    "success": False,
                    "error": "Invalid file format. Please upload a PDF (.pdf), Word (.docx), or Text (.txt) document."
                }), 400

            filename_used = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename_used}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            
            file.save(file_path)

            try:
                resume_text = ResumeParser.extract_text(file_path)
            finally:
                # Cleanup uploaded file after text extraction for security
                if os.path.exists(file_path):
                    os.remove(file_path)

        # Fallback to pasted resume text if no file uploaded
        elif request.form.get('resume_text', '').strip():
            resume_text = request.form.get('resume_text', '').strip()
            filename_used = "Pasted Resume Text"

        else:
            return jsonify({
                "success": False,
                "error": "Please upload a resume (PDF/DOCX/TXT) or paste your resume text."
            }), 400

        if len(resume_text) < 30:
            return jsonify({
                "success": False,
                "error": "Extracted resume content is too short or empty. Please ensure the document contains readable text."
            }), 400

        # Perform AI Agent analysis
        analysis_result = ai_matcher.analyze(resume_text=resume_text, job_description=job_description)
        metadata = ResumeParser.extract_metadata(resume_text)

        return jsonify({
            "success": True,
            "filename": filename_used,
            "resume_metadata": metadata,
            "data": analysis_result
        })

    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"[HireMind App Error]: {str(e)}", file=sys.stderr)
        return jsonify({
            "success": False,
            "error": f"An error occurred while analyzing candidate profile: {str(e)}"
        }), 500

@app.route('/api/recruiter-analyze', methods=['POST'])
def recruiter_analyze():
    """
    Recruiter Mode API Endpoint: Batch compares multiple candidate resumes against 1 Job Description
    and ranks candidates by match score.
    """
    try:
        job_description = request.form.get('job_description', '').strip()
        if not job_description:
            return jsonify({"success": False, "error": "Job Description is required for recruiter ranking."}), 400

        uploaded_files = request.files.getlist('resumes')
        if not uploaded_files or len(uploaded_files) == 0 or (len(uploaded_files) == 1 and uploaded_files[0].filename == ''):
            return jsonify({"success": False, "error": "Please select at least 2 resumes for recruiter candidate ranking."}), 400

        candidates = []

        for idx, file in enumerate(uploaded_files, 1):
            if not file or file.filename == '':
                continue
            if not allowed_file(file.filename):
                continue

            orig_filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{orig_filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)

            try:
                r_text = ResumeParser.extract_text(file_path)
                analysis = ai_matcher.analyze(resume_text=r_text, job_description=job_description)
                
                # Derive candidate name from filename or text
                candidate_name = os.path.splitext(orig_filename)[0].replace('_', ' ').replace('-', ' ').title()
                if "Sample Resume" in candidate_name or len(candidate_name) < 3:
                    candidate_name = f"Candidate #{idx}"

                candidates.append({
                    "id": f"cand-{idx}",
                    "name": candidate_name,
                    "filename": orig_filename,
                    "overall_score": analysis.get("overall_match_score", 70),
                    "match_label": analysis.get("match_label", "Moderate Fit"),
                    "status_color": analysis.get("status_color", "#3b82f6"),
                    "analysis": analysis
                })
            except Exception as parse_err:
                print(f"Skipping {orig_filename} due to parse error: {parse_err}")
            finally:
                if os.path.exists(file_path):
                    os.remove(file_path)

        if not candidates:
            return jsonify({"success": False, "error": "Could not extract text from any uploaded files."}), 400

        # Sort candidates descending by overall match score
        candidates.sort(key=lambda c: c['overall_score'], reverse=True)

        return jsonify({
            "success": True,
            "job_description_length": len(job_description),
            "total_candidates": len(candidates),
            "candidates": candidates
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Recruiter analysis failed: {str(e)}"}), 500

@app.route('/api/demo-data', methods=['GET'])
def get_demo_data():
    """
    Demo Mode API Endpoint: Instantly returns pre-analyzed realistic sample data
    for one-click hackathon presentations.
    """
    sample_resume_path = os.path.join(os.path.dirname(__file__), 'sample_data', 'sample_resume.txt')
    sample_job_path = os.path.join(os.path.dirname(__file__), 'sample_data', 'sample_job.txt')

    sample_resume = ""
    sample_job = ""

    if os.path.exists(sample_resume_path):
        with open(sample_resume_path, 'r', encoding='utf-8') as f:
            sample_resume = f.read()

    if os.path.exists(sample_job_path):
        with open(sample_job_path, 'r', encoding='utf-8') as f:
            sample_job = f.read()

    analysis = ai_matcher._generate_mock_analysis(sample_resume, sample_job)

    return jsonify({
        "success": True,
        "is_demo": True,
        "sample_resume": sample_resume,
        "sample_job": sample_job,
        "filename": "Alex_Morgan_Resume.pdf",
        "resume_metadata": {
            "word_count": 215,
            "char_count": 1420,
            "detected_emails": ["alex.morgan@example.com"],
            "detected_phones": ["(555) 234-5678"]
        },
        "data": analysis
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"==================================================")
    print(f"🚀 HIREMIND AI - Agentic Resume Intelligence Platform")
    print(f"Server starting at: http://127.0.0.1:{port}")
    print(f"API Mode: {'CONFIGURED (' + ai_matcher.provider + ')' if ai_matcher.is_api_configured() else 'MOCK / DEMO MODE (Fallback Active)'}")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=True)
