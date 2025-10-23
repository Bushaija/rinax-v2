import { notFound } from "next/navigation";
import { ProductPageForm } from "../../../_components/products/dynamic-product-form";
import { getProductById } from "../../../_lib/product-queries";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);
  
  if (!product) {
    notFound();
  }
  
  return <ProductPageForm product={product} mode="edit" />;
}
