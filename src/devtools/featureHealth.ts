import { validateSystemFeatures } from '../core/system/featureValidator';

export function runHealthCheck() {
  console.log("=== SYSTEM HEALTH DASHBOARD ===");
  try {
    const { errors, warnings, total } = validateSystemFeatures();
    
    console.log(`\n📊 Total Features: ${total}`);
    console.log(`✅ Healthy Features: ${total - errors.length - warnings.length}`);
    
    if (errors.length > 0) {
      console.log(`\n🚨 Broken Features (${errors.length}):`);
      errors.forEach(e => console.log(`  - ${e}`));
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️ Warnings (${warnings.length}):`);
      warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    console.log("\n===============================");
  } catch (err) {
    console.error("Health check failed critically:", err);
  }
}
