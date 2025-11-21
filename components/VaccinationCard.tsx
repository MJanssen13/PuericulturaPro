import React, { useState } from 'react';
import { getVaccineStatus, VaccineStatus } from '../services/vaccineLogic';
import { ExclamationTriangleIcon, CheckBadgeIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface Props {
  birthDate: string;
  patientName?: string;
}

export const VaccinationCard: React.FC<Props> = ({ birthDate, patientName }) => {
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

  const renderCell = (ruleId: string, bgColor: string, heightClass = "h-24") => {
    const data = getVaccineStatus(ruleId, birthDate);
    const isApplied = appliedVaccines[ruleId];
    
    let content = null;
    let containerClass = "bg-white/50"; // Default background

    // Logic for Status Appearance
    if (isApplied) {
        // CHECKED -> GREEN
        containerClass = "bg-emerald-100";
        content = (
            <div className="flex flex-col items-center justify-center h-full text-center p-1 w-full">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600 mb-1" />
                <span className="text-[10px] font-bold text-emerald-700 leading-tight uppercase">Aplicado</span>
            </div>
        );
    } else if (data.status === 'LATE') {
        // LATE -> RED
        containerClass = "bg-red-100/90";
        content = (
            <div className="flex flex-col items-center justify-center h-full text-center p-1 w-full">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mb-1" />
                <span className="text-[10px] font-bold text-red-700 leading-tight uppercase">Em Atraso</span>
                <span className="text-[9px] font-medium text-red-600 leading-tight mt-0.5">{data.message}</span>
            </div>
        );
    } else if (data.status === 'DUE') {
        // DUE -> BLUE (Requested change)
        containerClass = "bg-blue-100/90";
        content = (
            <div className="flex flex-col items-center justify-center h-full text-center p-1 w-full animate-pulse">
                <CheckBadgeIcon className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[10px] font-bold text-blue-700 leading-tight uppercase">Aplicar Agora</span>
                <span className="text-[9px] font-medium text-blue-600 leading-tight mt-0.5">Idade Ideal</span>
            </div>
        );
    } else {
        // FUTURE -> GRAY/DEFAULT
        content = (
            <div className="flex flex-col items-center justify-center h-full text-center p-1 opacity-60">
                <ClockIcon className="w-4 h-4 text-slate-500 mb-1" />
                <span className="text-[10px] font-bold text-slate-600 leading-tight uppercase">Aguardar</span>
                <span className="text-[9px] font-medium text-slate-500 leading-tight mt-0.5">{data.message}</span>
            </div>
        );
    }

    return (
        <div className={`relative flex flex-col ${heightClass} border border-slate-300 bg-white overflow-hidden group`}>
             {/* Checkbox */}
             <div className="absolute top-1 right-1 z-30">
                <input 
                    type="checkbox"
                    checked={!!isApplied}
                    onChange={() => toggleVaccine(ruleId)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shadow-sm bg-white/80 backdrop-blur-sm"
                />
             </div>

             {/* Imitate the paper fields lines (Hidden if applied to look cleaner) */}
             <div className={`absolute inset-0 flex flex-col pointer-events-none z-0 opacity-20 ${isApplied ? 'hidden' : ''}`}>
                <div className="flex-1 border-b border-slate-400"></div>
                <div className="flex-1 border-b border-slate-400"></div>
                <div className="flex-1 border-b border-slate-400"></div>
                <div className="flex-1"></div>
             </div>
             
             {/* Header of the cell (Dose label) */}
             <div style={{ backgroundColor: bgColor }} className="z-10 py-1 px-1 text-[10px] font-bold text-slate-800 text-center border-b border-slate-300 shadow-sm relative">
                {data.rule.doseLabel}
             </div>

             {/* Status Content overlay */}
             <div className={`flex-1 z-10 flex items-center justify-center p-1 transition-colors duration-300 ${containerClass}`}>
                 {content}
             </div>
        </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-2 shadow-lg rounded-sm font-sans">
      
      {/* Header */}
      <div className="border-2 border-blue-900 mb-4">
        <div className="bg-blue-100 p-2 border-b border-blue-900">
           <h2 className="text-xl font-bold text-blue-900 uppercase">Registro da Aplicação das Vacinas do Calendário Nacional</h2>
        </div>
        <div className="p-2 flex gap-2 text-sm font-bold text-slate-700">
           <span>NOME: <span className="font-normal text-slate-900">{patientName || '__________________________________________________'}</span></span>
           <span className="ml-auto">Data de Nascimento: <span className="font-normal text-slate-900">{birthDate ? new Date(birthDate).toLocaleDateString('pt-BR') : '__/__/____'}</span></span>
        </div>
      </div>

      {/* =================================================================================
          GRID 1: 0 to 12 Months
      ================================================================================= */}
      
      <div className="border-2 border-slate-800">
         <div className="flex">
            {/* SIDEBAR LABEL */}
            <div className="w-8 bg-white border-r border-slate-800 flex items-center justify-center shrink-0">
               <span className="text-xs font-bold text-slate-800 -rotate-90 whitespace-nowrap tracking-widest">Até 12 meses</span>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col">
               
               {/* ROW 1: BCG, HepB, Penta 1, Penta 2, Penta 3, Rota 1, Rota 2 */}
               <div className="grid grid-cols-7 text-[10px] font-bold text-center border-b border-slate-400">
                  <div style={{backgroundColor: colors.bcgPurple}} className="py-1 border-r border-slate-400">BCG</div>
                  <div style={{backgroundColor: colors.hepOrange}} className="py-1 border-r border-slate-400">Hepatite B</div>
                  <div style={{backgroundColor: colors.pentaOrange}} className="col-span-3 py-1 border-r border-slate-400">Penta</div>
                  <div style={{backgroundColor: colors.rotaPink}} className="col-span-2 py-1">Rotavírus humano</div>
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
                      <div style={{backgroundColor: colors.pneumoYellow}} className="col-span-2 py-1 border-r border-slate-400">Pneumocócica 10V (conjugada)</div>
                      <div style={{backgroundColor: colors.vipCyan}} className="col-span-3 py-1 border-r border-slate-400">VIP</div>
                      <div style={{backgroundColor: colors.menGreen}} className="col-span-2 py-1">Meningocócica C (conjugada)</div>
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
                       <div style={{backgroundColor: colors.faTeal}} className="py-1 border-r border-slate-400">Febre amarela</div>
                       <div style={{backgroundColor: colors.tripRed}} className="py-1 border-r border-slate-400">Tríplice viral</div>
                       <div style={{backgroundColor: colors.covidMagenta}} className="col-span-3 py-1 border-r border-slate-400">Covid-19</div>
                       <div style={{backgroundColor: colors.fluOrange}} className="col-span-2 py-1">Influenza trivalente</div>
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
               <span className="text-xs font-bold text-slate-800 -rotate-90 whitespace-nowrap tracking-widest">A partir de 12 meses</span>
             </div>

             {/* MAIN CONTENT */}
             <div className="flex-1 flex flex-col">
                 
                 {/* ROW 1: Pneumo Ref, Men C Ref, DTP (Ref 1, 2), VOP (Ref 1, 2), Tetraviral */}
                 <div className="grid grid-cols-7 text-[10px] font-bold text-center border-b border-slate-400">
                      <div style={{backgroundColor: colors.pneumoYellow}} className="border-r border-slate-400 py-1">Pneumocócica 10V (conjugada)</div>
                      <div style={{backgroundColor: colors.menGreen}} className="border-r border-slate-400 py-1">Meningocócica C (conjugada)</div>
                      <div style={{backgroundColor: colors.pentaOrange}} className="col-span-2 border-r border-slate-400 py-1">DTP</div>
                      <div style={{backgroundColor: colors.vipCyan}} className="col-span-2 border-r border-slate-400 py-1">VOP</div>
                      <div style={{backgroundColor: colors.tripRed}} className="py-1">Tetraviral</div>
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
                          <div style={{backgroundColor: colors.varicelaPink}} className="border-r border-slate-400 py-1">Varicela</div>
                          <div style={{backgroundColor: colors.faTeal}} className="border-r border-slate-400 py-1">Febre amarela</div>
                          <div style={{backgroundColor: colors.brown}} className="border-r border-slate-400 py-1">Hepatite A</div>
                          <div style={{backgroundColor: colors.hpvPurple}} className="col-span-2 border-r border-slate-400 py-1">HPV</div>
                          <div style={{backgroundColor: colors.pneumo23Orange}} className="border-r border-slate-400 py-1">Pneumocócica 23V (povos indígenas)</div>
                          <div className="py-1 bg-white"></div>
                     </div>
                     <div className="grid grid-cols-7">
                          <div className="border-r border-slate-400">{renderCell('varicela_2', colors.varicelaPink)}</div>
                          <div className="border-r border-slate-400">{renderCell('fa_ref', colors.faTeal)}</div>
                          <div className="border-r border-slate-400">{renderCell('hepa_1', colors.brown)}</div>
                          <div className="border-r border-slate-400">{renderCell('hpv_1', colors.hpvPurple)}</div>
                          <div className="border-r border-slate-400">{renderCell('hpv_2', colors.hpvPurple)}</div>
                          <div className="border-r border-slate-400">{renderCell('pneumo_23', colors.pneumo23Orange)}</div>
                          <div className="flex items-center justify-center p-2 text-center text-[9px] text-slate-500 font-handwriting">
                              Proteja a criança.<br/>Mantenha a vacinação atualizada.
                          </div>
                     </div>
                 </div>

             </div>
         </div>
      </div>

      {/* Footer Image / Message */}
      <div className="mt-4 bg-gradient-to-r from-yellow-400 via-green-500 to-blue-600 p-4 rounded text-white text-center shadow-md">
         <h3 className="text-lg font-bold uppercase text-white drop-shadow-md">Movimento Nacional Pela Vacinação</h3>
         <p className="text-sm font-medium text-white/90">Vacina é vida. Vacina é para todos.</p>
      </div>

    </div>
  );
};
