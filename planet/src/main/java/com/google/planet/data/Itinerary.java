// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.planet.data;

import java.util.List;
import java.util.Arrays;

public final class Itinerary {
    public final List<ItineraryItem> itineraryItems; 
    public final String errorMessage;

    public Itinerary(List<ItineraryItem> itineraryItems, String errorMessage) {
        this.itineraryItems = itineraryItems;
        this.errorMessage = errorMessage;
    }
}
