import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FileEarmarkPdf } from 'react-bootstrap-icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ExportReportButton({ targetId, fileName = 'Health_Report.pdf' }) {
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePDF = async () => {
        setIsGenerating(true);
        try {
            const element = document.getElementById(targetId);
            if (!element) return;

            const canvas = await html2canvas(element, {
                scale: 2, // Higher resolution
                useCORS: true, // For images if any
                backgroundColor: '#f8f9fa' // Ensure background is captured
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(fileName);
        } catch (error) {
            console.error("PDF Generation Failed", error);
        }
        setIsGenerating(false);
    };

    return (
        <Button
            variant="outline-dark"
            onClick={generatePDF}
            disabled={isGenerating}
            className="d-flex align-items-center gap-2"
        >
            <FileEarmarkPdf />
            {isGenerating ? 'Exporting...' : 'Export Report'}
        </Button>
    );
}
