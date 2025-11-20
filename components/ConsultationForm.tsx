import React, { useState, useEffect } from 'react';
import { Consultation } from '../types';

interface Props {
  patientId: string;
  onSave: (data: Omit<Consultation, 'id' | 'created_at'>) => void;
  onCancel: () => void;
}

export const ConsultationForm: React.FC<Props> = ({ patientId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight_grams: '',
    height_cm: '',
    cephalic_cm: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      patient_id: patientId,
      date: formData.date,
      weight_grams: Number(formData.weight_grams),
      height_cm: Number(formData.height_cm),
      cephalic_cm: Number(formData.cephalic_cm),
      // Calculate BMI automatically
      bmi: Number(formData.weight_grams) && Number(formData.height_cm) 
        ? (Number(formData.weight_grams) / 1000) / Math.pow(Number(formData.height_cm) / 100, 2)
        : 0,
      notes: formData.notes
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Nova Consulta</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Data</label>
            <input
              type="date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Peso (gramas)</label>
            <input
              type="number"
              required
              placeholder="ex: 3500"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
              value={formData.weight_grams}
              onChange={e => setFormData({...formData, weight_grams: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Altura (cm)</label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="ex: 50.5"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
              value={formData.height_cm}
              onChange={e => setFormData({...formData, height_cm: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Perímetro Cefálico (cm)</label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="ex: 35.0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
              value={formData.cephalic_cm}
              onChange={e => setFormData({...formData, cephalic_cm: e.target.value})}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Notas / Vacinas</label>
          <textarea
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border"
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
          >
            Salvar Dados
          </button>
        </div>
      </form>
    </div>
  );
};
