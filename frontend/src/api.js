const API_BASE = '/api/auth/';

export async function api(route, options = {}) {
  const isFormData = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_BASE}${route}`, {
      credentials: 'include',
      headers: options.body && !isFormData ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
      ...options
    });
  } catch (error) {
    throw new Error('Backend belum berjalan. Jalankan server aplikasi terlebih dahulu.');
  }
  let result;
  const rawResponse = response.clone();
  try {
    result = await response.json();
  } catch (error) {
    const rawText = await rawResponse.text().catch(() => '');
    throw new Error(rawText.trim() || `Server mengembalikan respons tidak valid (${response.status}).`);
  }
  if (!response.ok || !result.success) throw new Error(result.message || 'Permintaan gagal');
  return result;
}
