-- Preço do cilindro novo (hardware) por variação e valor dos cilindros cobrado no pedido.
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "cylinderPrice" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cylinderFee" INTEGER NOT NULL DEFAULT 0;

-- Valores de referência do catálogo existente (editáveis depois pela administração).
UPDATE "ProductVariant" SET "cylinderPrice" = CASE "weightKg"
  WHEN 6 THEN 12000
  WHEN 12 THEN 18000
  WHEN 45 THEN 35000
  ELSE "cylinderPrice"
END
WHERE "sku" IN ('GE-6KG', 'GE-12KG', 'GE-45KG');
