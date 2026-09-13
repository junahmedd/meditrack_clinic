import React from 'react';
import { MediTrackLogo } from './MediTrackLogo';

interface PrescriptionItem {
  medicine: string;
  dosage: string;
  days: string;
  price?: string;
}

interface PrescriptionTemplateProps {
  patientName: string;
  patientAge?: string;
  patientAddress?: string;
  date: string;
  items: PrescriptionItem[];
  notes?: string;
  doctorName: string;
  clinicName: string;
  id: string; // DOM ID for capture
}

export const PrescriptionTemplate: React.FC<PrescriptionTemplateProps> = ({
  patientName,
  patientAge,
  patientAddress,
  date,
  items,
  notes,
  doctorName,
  clinicName,
  id
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div 
      id={id}
      className="p-16 font-sans antialiased"
      style={{ 
        width: '800px', 
        minHeight: '1100px', 
        position: 'absolute', 
        left: '-9999px', 
        top: '-9999px',
        backgroundColor: '#ffffff',
        color: '#1a202c',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header Border */}
      <div style={{ width: '100%', height: '4px', backgroundColor: '#f1f5f9', marginBottom: '40px', borderRadius: '9999px' }}></div>

      {/* Header Section */}
      <div className="flex items-start gap-8 mb-12">
        {/* Left Edge: MediTrack Official Logo */}
        <div className="shrink-0">
          <MediTrackLogo size="lg" theme="light" showWordmark={true} showSubtitle={true} showBadge={false} />
        </div>

        {/* Fluid Middle Section: Clinic Name */}
        <div className="flex-1 min-w-0 pl-4 border-l border-slate-200">
          <h1 className="text-4xl font-black tracking-tight leading-tight mb-1 break-words" style={{ color: '#0f172a' }}>
            {clinicName.toUpperCase()}
          </h1>
          <p className="font-bold tracking-[0.2em] uppercase text-xs" style={{ color: '#64748b' }}>
            Medical Center &amp; Pharmacy
          </p>
        </div>

        {/* Right Edge: Date Block - strictly protected */}
        <div className="shrink-0 p-6 rounded-3xl flex flex-col gap-1 min-w-[160px] text-right" style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: '#94a3b8' }}>DATE</p>
          <p className="text-2xl font-black" style={{ color: '#1e293b' }}>{date}</p>
        </div>
      </div>

      <div style={{ width: '100%', height: '2px', backgroundColor: '#0f172a', marginBottom: '56px' }}></div>

      {/* Patient Section */}
      <div className="grid grid-cols-12 gap-12 mb-20">
        <div className="col-span-12 space-y-8">
          <div className="flex gap-12">
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#94a3b8' }}>Patient Name</p>
              <p className="text-3xl font-black pb-3" style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{patientName}</p>
            </div>
            <div className="w-32">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#94a3b8' }}>Age</p>
              <p className="text-3xl font-black pb-3" style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{patientAge || '--'}</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#94a3b8' }}>Address</p>
            <p className="text-xl font-bold pb-3" style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{patientAddress || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Prescription Table */}
      <div className="flex-1">
        <table className="w-full mb-16">
          <thead>
            <tr style={{ borderBottom: '2px solid #0f172a' }}>
              <th className="py-6 text-left font-black uppercase tracking-[0.1em] text-[12px] w-20" style={{ color: '#1e293b' }}>SI.NO</th>
              <th className="py-6 text-left font-black uppercase tracking-[0.1em] text-[12px]" style={{ color: '#1e293b' }}>MEDICINE</th>
              <th className="py-6 text-left font-black uppercase tracking-[0.1em] text-[12px]" style={{ color: '#1e293b' }}>DOSAGE</th>
              <th className="py-6 text-right font-black uppercase tracking-[0.1em] text-[12px] w-24" style={{ color: '#1e293b' }}>DAYS</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td className="py-10 text-lg font-black italic" style={{ color: '#94a3b8' }}>{idx + 1}</td>
                <td className="py-10 font-bold text-2xl italic tracking-tight" style={{ color: '#1e293b' }}>{item.medicine}</td>
                <td className="py-10 font-medium text-xl tracking-wide" style={{ color: '#475569' }}>{item.dosage}</td>
                <td className="py-10 font-black text-xl text-right" style={{ color: '#1e293b' }}>{item.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {items.length === 0 && (
          <div className="py-20 text-center rounded-[32px] mb-12" style={{ border: '2px dashed #f1f5f9' }}>
            <p className="font-black italic" style={{ color: '#cbd5e1' }}>No medications prescribed in this session.</p>
          </div>
        )}

        {/* Notes Section */}
        {notes && (
          <div className="mb-16">
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-6" style={{ color: '#475569' }}>Notes:</h3>
            <div className="space-y-3">
              {notes.split('\n').filter(line => line.trim()).map((line, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full mt-2.5" style={{ backgroundColor: '#94a3b8' }} />
                  <p className="text-xl font-bold leading-relaxed" style={{ color: '#334155' }}>
                    {line.replace(/^[•*-]\s*/, '')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div className="mt-auto pt-12">
        <div className="flex justify-between items-end">
          <div className="space-y-6">
            <p className="text-sm font-black italic tracking-tight" style={{ color: '#94a3b8' }}>
              Digital Signature Secured by MediTrack
            </p>
            <div 
              className="inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm"
              style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#dcfce7' }}
            >
              Verified Healthcare Provider
            </div>
          </div>
          <div className="text-right">
            <div className="w-64 h-1 mb-4 rounded-full ml-auto" style={{ backgroundColor: '#f1f5f9' }}></div>
            <p className="text-2xl font-black tracking-tight" style={{ color: '#0f172a' }}>
              {doctorName.toUpperCase()}
            </p>
            <p className="text-[11px] font-black tracking-[0.1em] uppercase mt-1" style={{ color: '#94a3b8' }}>
              MBBS, MS - Clinic Head
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
