// app/vehicle-garage/page.tsx
"use client";

import { useState } from "react";
import { useTripNavigationStore } from "@/app/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";

interface Vehicle {
  id: string;
  name: string;
  fuelConsumption: number;
  fuelType: string;
  isDefault: boolean;
}

export default function VehicleGarageClient() {
  const {
    vehicles,
    addVehicle,
    editVehicle,
    deleteVehicle,
    setDefaultVehicle,
  } = useTripNavigationStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    fuelConsumption: "",
    fuelType: "Petrol",
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
    setFormData({ name: "", fuelConsumption: "", fuelType: "Petrol" });
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
    setFormData({ name: "", fuelConsumption: "", fuelType: "Petrol" });
  };

  return (
    <div className="shadow-base space-y-6 rounded-3xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-primary-500 text-sm font-semibold tracking-[0.3em] uppercase">
            TravelSync
          </p>
          <h1 className="text-2xl font-bold text-gray-800">Vehicle Garage</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary-500 hover:bg-primary-500 hover:shadow-hover rounded-full px-4 py-2 text-sm font-semibold text-white hover:brightness-90"
          >
            + Add Vehicle
          </button>
        )}
      </div>

      {showForm && (
        <div className="shadow-base rounded-3xl border border-gray-200 bg-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">
            {editingId ? "Edit Vehicle" : "Add New Vehicle"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="mt-4 grid gap-4 sm:grid-cols-3"
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Vehicle Name
              </label>
              <input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Myvi 1.3"
                className="focus:border-primary-500 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Fuel Consumption (km/L)
              </label>
              <input
                value={formData.fuelConsumption}
                onChange={(e) =>
                  setFormData({ ...formData, fuelConsumption: e.target.value })
                }
                placeholder="e.g., 18"
                type="number"
                step="0.1"
                className="focus:border-primary-500 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Fuel Type
              </label>
              <select
                value={formData.fuelType}
                onChange={(e) =>
                  setFormData({ ...formData, fuelType: e.target.value })
                }
                className="focus:border-primary-500 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
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
                className="bg-primary-500 hover:bg-primary-500 hover:shadow-hover rounded-2xl px-6 py-2 text-sm font-semibold text-white hover:brightness-90"
              >
                {editingId ? "Update Vehicle" : "Save Vehicle"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-2xl border border-gray-200 px-6 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="shadow-base rounded-3xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">
          {vehicles.length} vehicles in garage
        </p>
        {vehicles.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-100 p-8 text-center text-sm text-gray-500">
            No vehicles added yet. Add your first vehicle!
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="rounded-2xl border border-gray-200 bg-gray-100 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-800">
                        {vehicle.name}
                      </h2>
                      {vehicle.isDefault && (
                        <span className="bg-success/10 text-success rounded-full px-2 py-0.5 text-xs font-semibold">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      ⛽ {vehicle.fuelConsumption} km/L • {vehicle.fuelType}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDefaultVehicle(vehicle.id)}
                      className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                        vehicle.isDefault
                          ? "border-success/20 bg-success/10 text-success"
                          : "hover:border-success/30 hover:bg-success/10 border-gray-200 bg-white text-gray-500"
                      }`}
                    >
                      {vehicle.isDefault ? "✓ Default" : "Set Default"}
                    </button>
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-500 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteVehicle(vehicle.id)}
                      className="border-error/20 text-error hover:bg-error/10 rounded-xl border bg-white px-3 py-1.5 text-sm font-semibold"
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
