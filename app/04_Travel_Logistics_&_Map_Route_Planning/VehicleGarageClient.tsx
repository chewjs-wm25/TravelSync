// app/vehicle-garage/page.tsx
'use client';

import { useState } from 'react';
import { useTripNavigationStore } from '@/src/store/useTripNavigationStore';

interface Vehicle {
  id: string;
  name: string;
  fuelConsumption: number;
  fuelType: string;
  isDefault: boolean;
}

export default function VehicleGarageClient() {
  const { vehicles, addVehicle, editVehicle, deleteVehicle, setDefaultVehicle } = useTripNavigationStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    fuelConsumption: '',
    fuelType: 'Petrol',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.fuelConsumption) return;

    if (editingId) {
      editVehicle(editingId, {
        name: formData.name,
        fuelConsumption: parseFloat(formData.fuelConsumption),
        fuelType: formData.fuelType,
      });
      setEditingId(null);
    } else {
      addVehicle({
        name: formData.name,
        fuelConsumption: parseFloat(formData.fuelConsumption),
        fuelType: formData.fuelType,
      });
    }
    setFormData({ name: '', fuelConsumption: '', fuelType: 'Petrol' });
    setShowForm(false);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      name: vehicle.name,
      fuelConsumption: vehicle.fuelConsumption.toString(),
      fuelType: vehicle.fuelType,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', fuelConsumption: '', fuelType: 'Petrol' });
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">TravelSync</p>
          <h1 className="text-2xl font-bold text-slate-900">Vehicle Garage</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Vehicle
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Vehicle Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Myvi 1.3"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Fuel Consumption (km/L)</label>
              <input
                value={formData.fuelConsumption}
                onChange={(e) => setFormData({ ...formData, fuelConsumption: e.target.value })}
                placeholder="e.g., 18"
                type="number"
                step="0.1"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Fuel Type</label>
              <select
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <button
                type="submit"
                className="rounded-2xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {editingId ? 'Update Vehicle' : 'Save Vehicle'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-2xl border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">{vehicles.length} vehicles in garage</p>
        {vehicles.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No vehicles added yet. Add your first vehicle!
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{vehicle.name}</h2>
                      {vehicle.isDefault && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      ⛽ {vehicle.fuelConsumption} km/L • {vehicle.fuelType}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDefaultVehicle(vehicle.id)}
                      className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                        vehicle.isDefault
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      {vehicle.isDefault ? '✓ Default' : 'Set Default'}
                    </button>
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteVehicle(vehicle.id)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}