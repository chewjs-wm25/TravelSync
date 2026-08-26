// Module 02 public Business Logic API
// Re-export core functions and types that other modules consume.

import type {
  TripRouteData,
  CollaborationTripData,
  ImportPlaceInput,
  ImportPlacesResult,
} from "./types";

import {
  getTripRouteData,
  getCollaborationTripData,
  createTrip,
  updateTrip,
  deleteTrip,
  getTripsForUser,
} from "./tripService";

import {
  createItinerary,
  getItinerariesForTrip,
  updateItinerary,
  deleteItinerary,
} from "./itineraryService";

import {
  createItineraryItem,
  updateItineraryItemById,
  deleteItineraryItemById,
  getItineraryItemsForItinerary,
  importPlaces,
} from "./itineraryItemService";

import {
  addItineraryChangedListener,
  removeItineraryChangedListener,
  triggerItineraryChanged,
} from "./events";

export {
  // trip operations
  getTripRouteData,
  getCollaborationTripData,
  createTrip,
  updateTrip,
  deleteTrip,
  getTripsForUser,
  // itinerary operations
  createItinerary,
  getItinerariesForTrip,
  updateItinerary,
  deleteItinerary,
  // itinerary item operations
  createItineraryItem,
  updateItineraryItemById,
  deleteItineraryItemById,
  getItineraryItemsForItinerary,
  importPlaces,
  // events
  addItineraryChangedListener,
  removeItineraryChangedListener,
  triggerItineraryChanged,
};

export type { TripRouteData, CollaborationTripData, ImportPlaceInput, ImportPlacesResult };
