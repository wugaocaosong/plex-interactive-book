<script setup>
import products from './pulian-products.json'
defineProps({ current: { type: String, required: true } })
</script>
<template>
  <nav class="pulian-products" aria-label="谱联产品">
    <p class="pulian-products-note">发现更多学习与协作工具，链接将在新窗口打开。</p>
    <ul>
      <li v-for="product in products.filter(item => item.id !== current)" :key="product.id">
        <a :href="product.url" target="_blank" rel="noopener noreferrer" :aria-label="product.name + '（新窗口打开）'">
          <span><strong>{{ product.name }}</strong><small>{{ product.description }}</small></span>
          <span aria-hidden="true">↗</span>
        </a>
      </li>
    </ul>
  </nav>
</template>
<style scoped>
.pulian-products{color:inherit;min-width:0;text-align:left}
.pulian-products-note{font-size:13px;line-height:1.6;margin:0 0 12px}
.pulian-products ul{list-style:none!important;padding:0!important;margin:0!important;display:grid;gap:8px}
.pulian-products li{margin:0!important;padding:0!important}
.pulian-products a{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px;padding:10px 14px;border:1px solid currentColor;border-radius:8px;color:inherit;text-decoration:none;box-sizing:border-box}
.pulian-products a:hover{background:color-mix(in srgb,currentColor 8%,transparent)}
.pulian-products a:focus-visible{outline:3px solid currentColor;outline-offset:3px}
.pulian-products strong,.pulian-products small{display:block;overflow-wrap:anywhere}
.pulian-products strong{font-size:15px;font-weight:650}
.pulian-products small{font-size:12px;line-height:1.6;margin-top:3px}
</style>
