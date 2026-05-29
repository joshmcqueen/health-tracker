import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Apple, ChartSpline, ListPlus, Scale, Utensils } from 'lucide-react';
import { ChartsScreen } from './ChartsScreen';
import { FoodLibraryScreen } from './FoodLibraryScreen';
import { FoodScreen } from './FoodScreen';
import { MealLibraryScreen } from './MealLibraryScreen';
import { WeightScreen } from './WeightScreen';

export function App() {
  return (
    <div className="app-shell">
      <main className="screen">
        <Routes>
          <Route path="/" element={<Navigate to="/food" replace />} />
          <Route path="/weight" element={<WeightScreen />} />
          <Route path="/food" element={<FoodScreen />} />
          <Route path="/foods" element={<FoodLibraryScreen />} />
          <Route path="/meals" element={<MealLibraryScreen />} />
          <Route path="/charts" element={<ChartsScreen />} />
        </Routes>
      </main>
      <nav className="bottom-nav" aria-label="Primary">
        <NavLink to="/weight">
          <Scale size={20} />
          <span>Weight</span>
        </NavLink>
        <NavLink to="/food">
          <Apple size={20} />
          <span>Food</span>
        </NavLink>
        <NavLink to="/foods">
          <ListPlus size={20} />
          <span>Foods</span>
        </NavLink>
        <NavLink to="/meals">
          <Utensils size={20} />
          <span>Meals</span>
        </NavLink>
        <NavLink to="/charts">
          <ChartSpline size={20} />
          <span>Charts</span>
        </NavLink>
      </nav>
    </div>
  );
}
