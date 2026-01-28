<script setup>
// Dashboard hanya statis dulu, nanti kita sambungkan ke API statistik
</script>

<template>
  <div class="container-fluid">
    <h2 class="mb-4 fw-bold text-dark">📊 Dashboard Utama</h2>
    
    <div class="row">
      <div class="col-md-4 mb-3">
        <div class="card bg-primary text-white shadow h-100 border-0">
          <div class="card-body">
            <h5 class="card-title"><i class="bi bi-tractor"></i> Total Aset</h5>
            <h2 class="fw-bold">2 Unit</h2>
            <p class="small">Traktor & Combine Harvester</p>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3">
        <div class="card bg-success text-white shadow h-100 border-0">
          <div class="card-body">
            <h5 class="card-title"><i class="bi bi-activity"></i> Alat Aktif</h5>
            <h2 class="fw-bold">1 Unit</h2>
            <p class="small">Sedang beroperasi sekarang</p>
          </div>
        </div>
      </div>

      <div class="col-md-4 mb-3">
        <div class="card bg-warning text-dark shadow h-100 border-0">
          <div class="card-body">
            <h5 class="card-title"><i class="bi bi-rulers"></i> Total Lahan</h5>
            <h2 class="fw-bold">15 Ha</h2>
            <p class="small">Estimasi pengerjaan bulan ini</p>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 p-5 bg-white rounded shadow-sm">
      <h3>Selamat Datang, Admin!</h3>
      <p class="lead">Silakan pilih menu <strong>Monitoring Peta</strong> di samping kiri untuk melihat lokasi alat secara real-time, atau menu <strong>Manajemen Aset</strong> untuk mendata alat baru.</p>
    </div>
  </div>
</template>