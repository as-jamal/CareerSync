import os
import sys

def generate_sample_docx(output_path):
    try:
        import docx
        doc = docx.Document()
        doc.add_heading('Alex Morgan', level=0)
        doc.add_paragraph('Email: alex.morgan@example.com | Phone: (555) 234-5678')
        doc.add_paragraph('GitHub: github.com/alexmorgan | LinkedIn: linkedin.com/in/alexmorgan')
        
        doc.add_heading('Professional Summary', level=1)
        doc.add_paragraph('Energetic Software Engineer with a strong background in Python backend development, REST API design, and SQL databases.')
        
        doc.add_heading('Education', level=1)
        doc.add_paragraph('Bachelor of Science in Computer Science — State University (GPA: 3.8/4.0)')
        
        doc.add_heading('Technical Skills', level=1)
        doc.add_paragraph('Python, Flask, HTML, CSS, JavaScript, SQL, PostgreSQL, REST APIs, Git, Linux')
        
        doc.add_heading('Key Projects', level=1)
        doc.add_paragraph('1. E-Commerce Backend Service (Python, Flask, SQL): Built RESTful API backend, normalized database schemas, reducing latency by 20%.')
        doc.add_paragraph('2. Student Portal Dashboard (Python, HTML, CSS, JavaScript): Created interactive analytics portal with Jinja templates.')
        
        doc.save(output_path)
        print(f"Successfully generated sample DOCX at: {output_path}")
    except Exception as e:
        print(f"Could not generate sample DOCX: {e}")

def generate_sample_pdf(output_path):
    # If pypdf/reportlab available or basic pdf writing
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        
        c = canvas.Canvas(output_path, pagesize=letter)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(50, 750, "Alex Morgan")
        c.setFont("Helvetica", 10)
        c.drawString(50, 735, "Email: alex.morgan@example.com | Phone: (555) 234-5678 | GitHub: github.com/alexmorgan")
        
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, 700, "Professional Summary")
        c.setFont("Helvetica", 10)
        c.drawString(50, 685, "Energetic Software Engineer skilled in Python, Flask, SQL, and RESTful API backend services.")
        
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, 650, "Technical Skills")
        c.setFont("Helvetica", 10)
        c.drawString(50, 635, "Python, Flask, HTML, CSS, JavaScript, SQL, PostgreSQL, REST APIs, Git, Linux CLI")
        
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, 600, "Projects")
        c.setFont("Helvetica", 10)
        c.drawString(50, 585, "- E-Commerce Backend (Python, Flask, SQL): Engineered REST APIs and relational database models.")
        c.drawString(50, 570, "- Analytics Dashboard (HTML, CSS, JS, Python): Built interactive reporting portal.")
        
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, 535, "Education")
        c.setFont("Helvetica", 10)
        c.drawString(50, 520, "B.S. in Computer Science — State University (2024)")
        
        c.save()
        print(f"Successfully generated sample PDF at: {output_path}")
    except ImportError:
        print("reportlab not installed, skipping PDF binary generation. Text fallback ready.")
    except Exception as e:
        print(f"Could not generate sample PDF: {e}")

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    generate_sample_docx(os.path.join(base_dir, 'sample_resume.docx'))
    generate_sample_pdf(os.path.join(base_dir, 'sample_resume.pdf'))
