

import React, { useState } from 'react';
import { getVaccineStatus, VaccineStatus } from '../services/vaccineLogic';
import { ExclamationTriangleIcon, CheckBadgeIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface Props {
  birthDate: string;
  consultationDate: string;
  patientName?: string;
}

export const VaccinationCard: React.FC<Props> = ({ birthDate, consultationDate, patientName }) => {
  // State to track which vaccines are marked as applied
  const [appliedVaccines, setAppliedVaccines] = useState<Record<string, boolean>>({});

  const toggleVaccine = (ruleId: string) => {
    setAppliedVaccines(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }));
  };
  
  // Colors mimicking the card
  const colors = {
    headerBlue: '#1e3a8a', // Deep blue
    bcgPurple: '#a5b4fc', // Light purple
    hepOrange: '#fdba74', // Light orange
    pentaOrange: '#fdba74',
    rotaPink: '#f9a8d4', // Pink
    pneumoYellow: '#fde047', // Yellow
    vipCyan: '#67e8f9', // Cyan/Blue
    menGreen: '#a7f3d0', // Light green (or cyan-ish)
    faTeal: '#99f6e4', // Teal
    tripRed: '#fca5a5', // Light red
    covidMagenta: '#f0abfc', // Magenta
    fluOrange: '#fb923c', // Darker Orange for Flu
    varicelaPink: '#fce7f3',
    hpvPurple: '#a78bfa',
    pneumo23Orange: '#fdba74',
    brown: '#d6d3d1', // Hep A
  };

  const renderCell = (ruleId: string, bgColor: string) => {
    const data = getVaccineStatus(ruleId, birthDate, consultationDate);
    const isApplied = appliedVaccines[ruleId];
    
    let statusContent = null;
    let containerClass = "bg-white/50"; // Default background

    // Logic for Status Appearance
    if (isApplied) {
        containerClass = "bg-emerald-100";
        statusContent = (
            <div className="flex flex-col items-center justify-center text-center">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600 mb-1" />
                <span className="text-[10px] font-bold text-emerald-700 leading-tight uppercase">Aplicado</span>
            </div>
        );
    } else if (data.status === 'Atrasado') {
        containerClass = "bg-red-100/90";
        statusContent = (
            <div className="flex flex-col items-center justify-center text-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mb-1" />
                <span className="text-[10px] font-bold text-red-700 leading-tight uppercase">{data.status}</span>
            </div>
        );
    } else if (data.status === 'Aplicar agora') {
        containerClass = "bg-blue-100/90";
        statusContent = (
            <div className="flex flex-col items-center justify-center text-center">
                <CheckBadgeIcon className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[10px] font-bold text-blue-700 leading-tight uppercase">{data.status}</span>
            </div>
        );
    } else if (data.status === 'Próxima aplicação') {
        containerClass = "bg-amber-50";
        statusContent = (
            <div className="flex flex-col items-center justify-center text-center opacity-90">
                <ClockIcon className="w-4 h-4 mb-1 text-amber-600" />
                <span className="text-[10px] font-bold leading-tight uppercase text-amber-700">
                    {data.status}
                </span>
            </div>
        );
    } else { // Aguardar
        containerClass = "bg-gray-50";
        statusContent = (
            <div className="flex flex-col items-center justify-center text-center opacity-90">
                <ClockIcon className="w-4 h-4 mb-1 text-slate-500" />
                <span className="text-[10px] font-bold leading-tight uppercase text-slate-600">
                    {data.status}
                </span>
            </div>
        );
    }

    return (
        <div className={`relative flex flex-col min-h-[7rem] border border-slate-300 bg-white overflow-hidden group`}>
             {/* Header of the cell (Dose label + checkbox) */}
             <div style={{ backgroundColor: bgColor }} className="z-10 py-1 px-2 flex justify-between items-center border-b border-slate-300 shadow-sm relative">
                <span className="text-[10px] font-bold text-slate-800 whitespace-nowrap">{data.rule.doseLabel}</span>
                <input 
                    type="checkbox"
                    checked={!!isApplied}
                    onChange={() => toggleVaccine(ruleId)}
                    className="h-4 w-4 rounded border-gray-400/50 text-emerald-600 focus:ring-emerald-500 cursor-pointer shadow-sm bg-white/50"
                />
             </div>

             {/* Main container with status color */}
             <div className={`flex-1 z-10 flex flex-col justify-between p-0 transition-colors duration-300 ${containerClass}`}>
                 {/* Status Content */}
                 <div className="flex-1 flex items-center justify-center p-1">
                    {statusContent}
                 </div>
                 {/* Momento Footer */}
                 <div className="w-full text-center py-1 bg-black/5 border-t border-black/10">
                    <p className="text-[9px] text-slate-800 font-medium leading-tight px-1">
                        <span className="font-bold">Momento:</span> {data.rule.description || 'N/A'}
                    </p>
                 </div>
             </div>
        </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-2 shadow-lg rounded-sm">
      
      {/* =================================================================================
          GRID 1: 0 to 12 Months
      ================================================================================= */}
      
      <div className="border-2 border-slate-800">
         <div className="flex">
            {/* SIDEBAR LABEL */}
            <div className="w-8 bg-white border-r border-slate-800 flex items-center justify-center shrink-0">
               <span className="text-xs font-bold text-slate-800 -rotate-90 whitespace-nowrap tracking-widest uppercase">Até 12 meses</span>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col">
               
               {/* ROW 1: BCG, HepB, Penta 1, Penta 2, Penta 3, Rota 1, Rota 2 */}
               <div className="grid grid-cols-7 text-[10px] font-bold text-center border-b border-slate-400">
                  <div style={{backgroundColor: colors.bcgPurple}} className="py-1 px-1 border-r border-slate-400 uppercase tracking-wider">BCG</div>
                  <div style={{backgroundColor: colors.hepOrange}} className="py-1 px-1 border-r border-slate-400 uppercase tracking-wider">Hepatite B</div>
                  <div style={{backgroundColor: colors.pentaOrange}} className="col-span-3 py-1 px-1 border-r border-slate-400 uppercase tracking-wider">Penta</div>
                  <div style={{backgroundColor: colors.rotaPink}} className="col-span-2 py-1 px-1 uppercase tracking-wider">Rotavírus humano</div>
               </div>
               <div className="grid grid-cols-7">
                  <div className="border-r border-slate-400">{renderCell('bcg', colors.bcgPurple)}</div>
                  <div className="border-r border-slate-400">{renderCell('hepb_birth', colors.hepOrange)}</div>
                  <div className="border-r border-slate-400">{renderCell('penta_1', colors.pentaOrange)}</div>
                  <div className="border-r border-slate-400">{renderCell('penta_2', colors.pentaOrange)}</div>
                  <div className="border-r border-slate-400">{renderCell('penta_3', colors.pentaOrange)}</div>
                  <div className="border-r border-slate-400">{renderCell('rota_1', colors.rotaPink)}</div>
                  <div className="">{renderCell('rota_2', colors.rotaPink)}</div>
               </div>
               
               {/* ROW 2: Pneumo 10V (1, 2), VIP (1, 2, 3), Men C (1, 2) */}
               <div className="border-t border-slate-400">
                  <div className="grid grid-cols-7 text-[10px] font-bold text-center border-b border-slate-400">
                      <div style={{backgroundColor: colors.pneumoYellow}} className="col-span-2 py-1 px-1 border-r border-slate-400 uppercase tracking-wider flex items-center justify-center">
                        <span>Pneumocócica 10V (conjugada)</span>
                      </div>
                      <div style={{backgroundColor: colors.vipCyan}} className="col-span-3 py-1 px-1 border-r border-slate-400 uppercase tracking-wider">VIP</div>
                      <div style={{backgroundColor: colors.menGreen}} className="col-span-2 py-1 px-1 uppercase tracking-wider">Meningocócica C (conjugada)</div>
                  </div>
                  <div className="grid grid-cols-7">
                      <div className="border-r border-slate-400">{renderCell('pneumo_1', colors.pneumoYellow)}</div>
                      <div className="border-r border-slate-400">{renderCell('pneumo_2', colors.pneumoYellow)}</div>
                      <div className="border-r border-slate-400">{renderCell('vip_1', colors.vipCyan)}</div>
                      <div className="border-r border-slate-400">{renderCell('vip_2', colors.vipCyan)}</div>
                      <div className="border-r border-slate-400">{renderCell('vip_3', colors.vipCyan)}</div>
                      <div className="border-r border-slate-400">{renderCell('menc_1', colors.menGreen)}</div>
                      <div className="">{renderCell('menc_2', colors.menGreen)}</div>
                  </div>
               </div>

               {/* ROW 3: Febre Amarela, Triplice Viral, Covid (1, 2, 3), Influenza (1, 2) */}
               <div className="border-t border-slate-400">
                   <div className="grid grid-cols-7 text-[10px] font-bold text-center border-b border-slate-400">
                       <div style={{backgroundColor: colors.faTeal}} className="py-1 px-1 border-r border-slate-400 uppercase tracking-wider">Febre amarela</div>
                       <div style={{backgroundColor: colors.tripRed}} className="py-1 px-1 border-r border-slate-400 uppercase tracking-wider">Tríplice viral</div>
                       <div style={{backgroundColor: colors.covidMagenta}} className="col-span-3 py-1 px-1 border-r border-slate-400 uppercase tracking-wider">Covid-19</div>
                       <div style={{backgroundColor: colors.fluOrange}} className="col-span-2 py-1 px-1 uppercase tracking-wider">Influenza trivalente</div>
                   </div>
                   <div className="grid grid-cols-7">
                       <div className="border-r border-slate-400">{renderCell('febre_amarela_1', colors.faTeal)}</div>
                       <div className="border-r border-slate-400">{renderCell('triplice_1', colors.tripRed)}</div>
                       <div className="border-r border-slate-400">{renderCell('covid_1', colors.covidMagenta)}</div>
                       <div className="border-r border-slate-400">{renderCell('covid_2', colors.covidMagenta)}</div>
                       <div className="border-r border-slate-400">{renderCell('covid_3', colors.covidMagenta)}</div>
                       <div className="border-r border-slate-400">{renderCell('influenza_1', colors.fluOrange)}</div>
                       <div className="">{renderCell('influenza_2', colors.fluOrange)}</div>
                   </div>
               </div>

            </div>
         </div>
      </div>

      {/* GAP */}
      <div className="h-4"></div>

      {/* =================================================================================
          GRID 2: > 12 Months
      ================================================================================= */}
      <div className="border-2 border-slate-800">
         <div className="flex">
             {/* SIDEBAR LABEL */}
             <div className="w-8 bg-white border-r border-slate-800 flex items-center justify-center shrink-0">
               <span className="text-xs font-bold text-slate-800 -rotate-90 whitespace-nowrap tracking-widest uppercase">A partir de 12 meses</span>
             </div>

             {/* MAIN CONTENT */}
             <div className="flex-1 flex flex-col">
                 
                 {/* ROW 1: Pneumo Ref, Men C Ref, DTP (Ref 1, 2), VOP (Ref 1, 2), Tetraviral */}
                 <div className="grid grid-cols-7 text-[10px] font-bold text-center border-b border-slate-400">
                      <div style={{backgroundColor: colors.pneumoYellow}} className="border-r border-slate-400 py-1 px-1 uppercase tracking-wider flex flex-col justify-center">
                        <span>Pneumocócica</span>
                        <span>10V</span>
                      </div>
                      <div style={{backgroundColor: colors.menGreen}} className="border-r border-slate-400 py-1 px-1 uppercase tracking-wider">Meningocócica C (ACWY)</div>
                      <div style={{backgroundColor: colors.pentaOrange}} className="col-span-2 border-r border-slate-400 py-1 px-1 uppercase tracking-wider">DTP</div>
                      <div style={{backgroundColor: colors.vipCyan}} className="col-span-2 border-r border-slate-400 py-1 px-1 uppercase tracking-wider">VOP / VIP</div>
                      <div style={{backgroundColor: colors.tripRed}} className="py-1 px-1 uppercase tracking-wider">Tetraviral</div>
                 </div>
                 <div className="grid grid-cols-7">
                      <div className="border-r border-slate-400">{renderCell('pneumo_ref', colors.pneumoYellow)}</div>
                      <div className="border-r border-slate-400">{renderCell('menc_ref', colors.menGreen)}</div>
                      <div className="border-r border-slate-400">{renderCell('dtp_ref1', colors.pentaOrange)}</div>
                      <div className="border-r border-slate-400">{renderCell('dtp_ref2', colors.pentaOrange)}</div>
                      <div className="border-r border-slate-400">{renderCell('vop_ref1', colors.vipCyan)}</div>
                      <div className="border-r border-slate-400">{renderCell('vop_ref2', colors.vipCyan)}</div>
                      <div className="">{renderCell('tetra_1', colors.tripRed)}</div>
                 </div>

                 {/* ROW 2: Varicela, Febre Amarela Ref, Hep A, HPV (2 doses), Pneumo 23V */}
                 <div className="border-t border-slate-400">
                     <div className="grid grid-cols-7 text-[10px] font-bold text-center border-b border-slate-400">
                          <div style={{backgroundColor: colors.varicelaPink}} className="border-r border-slate-400 py-1 px-1 uppercase tracking-wider">Varicela</div>
                          <div style={{backgroundColor: colors.faTeal}} className="border-r border-slate-400 py-1 px-1 uppercase tracking-wider">Febre amarela</div>
                          <div style={{backgroundColor: colors.brown}} className="border-r border-slate-400 py-1 px-1 uppercase tracking-wider">Hepatite A</div>
                          <div style={{backgroundColor: colors.hpvPurple}} className="col-span-2 border-r border-slate-400 py-1 px-1 uppercase tracking-wider">HPV</div>
                          <div style={{backgroundColor: colors.pneumo23Orange}} className="border-r border-slate-400 py-1 px-1 uppercase tracking-wider flex flex-col justify-center leading-tight">
                            <span>Pneumocócica</span>
                            <span>23V (indígenas)</span>
                          </div>
                          <div className="py-1 bg-white"></div>
                     </div>
                     <div className="grid grid-cols-7">
                          <div className="border-r border-slate-400">{renderCell('varicela_2', colors.varicelaPink)}</div>
                          <div className="border-r border-slate-400">{renderCell('fa_ref', colors.faTeal)}</div>
                          <div className="border-r border-slate-400">{renderCell('hepa_1', colors.brown)}</div>
                          <div className="border-r border-slate-400">{renderCell('hpv_1', colors.hpvPurple)}</div>
                          <div className="border-r border-slate-400">{renderCell('hpv_2', colors.hpvPurple)}</div>
                          <div className="border-r border-slate-400">{renderCell('pneumo_23', colors.pneumo23Orange)}</div>
                          <div></div>
                     </div>
                 </div>

             </div>
         </div>
      </div>

    </div>
  );
};
