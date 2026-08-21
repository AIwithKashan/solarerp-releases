import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Fonts
JAMEEL_FONT_PATH = "C:\\Windows\\Fonts\\Jameel Noori Nastaleeq.ttf"
ARIAL_FONT_PATH = "C:\\Windows\\Fonts\\arial.ttf"
ARIAL_BOLD_PATH = "C:\\Windows\\Fonts\\arialbd.ttf"

if os.path.exists(JAMEEL_FONT_PATH):
    pdfmetrics.registerFont(TTFont('JameelNastaleeq', JAMEEL_FONT_PATH))
if os.path.exists(ARIAL_FONT_PATH):
    pdfmetrics.registerFont(TTFont('Arial', ARIAL_FONT_PATH))
if os.path.exists(ARIAL_BOLD_PATH):
    pdfmetrics.registerFont(TTFont('Arial-Bold', ARIAL_BOLD_PATH))

import arabic_reshaper
from bidi.algorithm import get_display

def reshape_urdu(text):
    if not text:
        return ""
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)

# Numbered Canvas for Professional Headers/Footers
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Suppress on cover page (page 1)
        if self._pageNumber > 1:
            # Header
            self.setStrokeColor(colors.HexColor('#e2e8f0'))
            self.setLineWidth(0.8)
            self.line(40, 755, 572, 755)
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor('#059669'))
            self.drawString(40, 762, "SolarERP Enterprise — Complete User Manual")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawRightString(572, 762, "AIwithKashan | Support: 0334-1911680")

            # Footer
            self.line(40, 45, 572, 45)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawString(40, 32, "Confidential — Authorized for Solar Business Operations")
            self.drawRightString(572, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


class UrduNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(UrduNumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(UrduNumberedCanvas, self).showPage()
        super(UrduNumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        if self._pageNumber > 1:
            self.setStrokeColor(colors.HexColor('#e2e8f0'))
            self.setLineWidth(0.8)
            self.line(40, 755, 572, 755)
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor('#059669'))
            self.drawString(40, 762, "SolarERP User Manual (Urdu Edition)")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawRightString(572, 762, "AIwithKashan | 0334-1911680")

            self.line(40, 45, 572, 45)
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor('#64748b'))
            self.drawString(40, 32, "SolarERP Enterprise - All Rights Reserved")
            self.drawRightString(572, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

# Helper box builders
def make_callout(text, title="PRO TIP / AHAM NOTE", border_color='#10b981', bg_color='#f0fdf4'):
    styles = getSampleStyleSheet()
    p_title = Paragraph(f"<b>{title}</b>", ParagraphStyle('CTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor(border_color)))
    p_body = Paragraph(text, ParagraphStyle('CBody', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=colors.HexColor('#1e293b')))
    tbl = Table([[p_title], [p_body]], colWidths=[532])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_color)),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor(border_color)),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 2),
    ]))
    return tbl

def make_step_card(step_num, title, instructions, example=None):
    styles = getSampleStyleSheet()
    header_html = f"<b><font color='#059669'>STEP {step_num}:</font> {title}</b>"
    p_hdr = Paragraph(header_html, ParagraphStyle('SHdr', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=colors.HexColor('#0f172a')))
    
    body_text = f"{instructions}"
    if example:
        body_text += f"<br/><br/><b><font color='#0284c7'>Real Business Example:</font></b><br/><i>{example}</i>"
    
    p_body = Paragraph(body_text, ParagraphStyle('SBody', parent=styles['Normal'], fontName='Helvetica', fontSize=9.5, leading=13.5, textColor=colors.HexColor('#334155')))
    
    tbl = Table([[p_hdr], [p_body]], colWidths=[532])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ffffff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('LINEBELOW', (0,0), (-1,0), 0.8, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
    ]))
    return tbl

print("Initialized Manual Generator base components successfully.")
