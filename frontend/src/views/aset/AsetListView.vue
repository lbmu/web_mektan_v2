<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const items = ref([]);
const loading = ref(true);

// --- AMBIL DATA ---
const fetchData = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/alsintan');
    items.value = response.data;
  } catch (error) {
    console.error("Gagal mengambil data:", error);
  } finally {
    loading.value = false;
  }
};

// --- HAPUS ---
const deleteItem = async (id) => {
  if (!confirm("Hapus data ini permanen?")) return;
  try {
    await axios.delete(`http://localhost:3000/api/alsintan/${id}`);
    fetchData(); 
  } catch (error) {
    alert("Gagal menghapus data");
  }
};

const formatLastSeen = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// --- NAVIGASI ---
const goToTambah = () => router.push({ name: 'aset-add' });
const goToEdit = (id) => router.push({ name: 'aset-edit', params: { id: id } });
const goToDetail = (id) => router.push({ name: 'aset-detail', params: { id: id } }); // NEW BUTTON
const goToMonitoring = (id) => router.push({ name: 'monitoring-detail', params: { id: id } });

onMounted(() => fetchData());
</script>

<template>
  <div class="container-fluid">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h3 class="fw-bold text-dark mb-0">🚜 Daftar Aset Alsintan</h3>
        <p class="text-muted small">Manajemen data dan status alat.</p>
      </div>
      <button @click="goToTambah" class="btn btn-primary shadow-sm">
        <i class="bi bi-plus-lg me-1"></i> Tambah Aset
      </button>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else class="card border-0 shadow-sm">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-light">
              <tr>
                <th class="ps-4">Alat & Kode</th>
                <th>Status (IoT)</th>
                <th>Telemetri</th>
                <th>Status Admin</th>
                <th class="text-end pe-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.alsintan_id">
                <td class="ps-4">
                  <div class="d-flex align-items-center">
                    <img :src="`http://localhost:3000/uploads/${item.gambar}`" 
                         class="rounded border object-fit-cover me-3" 
                         width="50" height="50" 
                         @error="$event.target.src='https://via.placeholder.com/50?text=IMG'">
                    <div>
                      <h6 class="mb-0 fw-bold text-dark">{{ item.nama_alat }}</h6>
                      <small class="text-muted badge bg-light text-dark border">{{ item.kode_perangkat }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge rounded-pill" 
                        :class="item.status_mesin === 'ON' ? 'bg-success animate-pulse' : 'bg-secondary'">
                    <i class="bi" :class="item.status_mesin === 'ON' ? 'bi-lightning-fill' : 'bi-power'"></i>
                    {{ item.status_mesin || 'OFF' }}
                  </span>
                  <div class="mt-1 small text-muted" style="font-size: 10px;">
                    {{ item.status_mesin === 'ON' ? '● Live' : formatLastSeen(item.last_heartbeat) }}
                  </div>
                </td>
                <td>
                   <small class="d-block"><i class="bi bi-battery-charging text-warning"></i> {{ item.tegangan_aki || '0' }} V</small>
                   <small class="d-block"><i class="bi bi-speedometer2 text-primary"></i> {{ item.total_hour_meter || '0' }} Jam</small>
                </td>
                <td>
                   <span class="badge bg-light text-dark border">{{ item.status_operasional }}</span>
                </td>
                
                <td class="text-end pe-4">
                  <div class="btn-group">
                    <button @click="goToDetail(item.alsintan_id)" 
                            class="btn btn-sm btn-outline-info" title="Lihat Detail">
                      <i class="bi bi-info-circle"></i>
                    </button>

                    <button @click="goToMonitoring(item.alsintan_id)" 
                            class="btn btn-sm btn-outline-primary" title="Pantau Live">
                      <i class="bi bi-geo-alt-fill"></i>
                    </button>

                    <button @click="deleteItem(item.alsintan_id)" 
                            class="btn btn-sm btn-outline-danger" title="Hapus">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>

              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse { animation: pulse 1.5s infinite; }
@keyframes pulse {
  0% { opacity: 1; box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.7); }
  70% { opacity: 1; box-shadow: 0 0 0 5px rgba(25, 135, 84, 0); }
  100% { opacity: 1; box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
}
</style>