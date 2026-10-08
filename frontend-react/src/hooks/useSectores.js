import { useState, useEffect } from 'react';
import { API_BASE } from '../api';
const REFRESH_INTERVAL = 60; // 60 seconds

export function useSectores() {
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL);

  const fetchSectores = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sectores/estado-actual`);
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      const data = await res.json();
      setReporte(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectores();

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchSectores();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { reporte, loading, error, secondsLeft, fetchSectores };
}
