import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getOwnedStoreContext(supabase: any, userId: string) {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (companyError) throw new Error(companyError.message);
  if (!company) throw new Error("Create a company profile first.");

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id,slug,name_ar,status")
    .eq("company_id", company.id)
    .maybeSingle();
  if (storeError) throw new Error(storeError.message);
  if (!store) throw new Error("Create your store first.");

  return { companyId: company.id as string, store };
}

export const getStoreAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { companyId, store } = await getOwnedStoreContext(context.supabase, context.userId);

    const { data: listings, error: listingsError } = await context.supabase
      .from("listings")
      .select("id,title_ar,title_en,images,stock_quantity,track_inventory,status")
      .eq("company_id", companyId);
    if (listingsError) throw new Error(listingsError.message);

    const listingIds = (listings ?? []).map((item: any) => item.id);
    let orders: any[] = [];
    if (listingIds.length > 0) {
      const { data, error } = await (context.supabase.from("wholesale_orders" as never) as any)
        .select("id,product_listing_id,listing_id,quantity,status,payment_status,total_amount,subtotal_amount,discount_amount,shipping_amount,currency,created_at")
        .or(`product_listing_id.in.(${listingIds.join(",")}),listing_id.in.(${listingIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      orders = data ?? [];
    }

    const completedStatuses = new Set(["delivered", "completed"]);
    const paidOrders = orders.filter((order) => order.payment_status === "paid" || completedStatuses.has(order.status));
    const grossRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
    const discounts = orders.reduce((sum, order) => sum + Number(order.discount_amount ?? 0), 0);
    const pendingRevenue = orders
      .filter((order) => order.payment_status !== "paid" && !["cancelled", "rejected", "returned"].includes(order.status))
      .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);

    const statusCounts: Record<string, number> = {};
    for (const order of orders) statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;

    const listingMap = new Map((listings ?? []).map((item: any) => [item.id, item]));
    const productStats = new Map<string, { listing_id: string; title: string; image: string | null; quantity: number; revenue: number; orders: number }>();
    for (const order of orders) {
      const listingId = order.product_listing_id ?? order.listing_id;
      if (!listingId) continue;
      const listing: any = listingMap.get(listingId);
      if (!listing) continue;
      const current = productStats.get(listingId) ?? {
        listing_id: listingId,
        title: listing.title_ar ?? listing.title_en ?? "منتج",
        image: listing.images?.[0] ?? null,
        quantity: 0,
        revenue: 0,
        orders: 0,
      };
      current.quantity += Number(order.quantity ?? 0);
      current.orders += 1;
      if (order.payment_status === "paid" || completedStatuses.has(order.status)) current.revenue += Number(order.total_amount ?? 0);
      productStats.set(listingId, current);
    }

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 8);

    const lowStock = (listings ?? [])
      .filter((item: any) => item.track_inventory && Number(item.stock_quantity ?? 0) <= 5)
      .map((item: any) => ({ id: item.id, title: item.title_ar ?? item.title_en, stock_quantity: Number(item.stock_quantity ?? 0) }))
      .slice(0, 10);

    const recentOrders = orders.slice(0, 12).map((order) => {
      const listingId = order.product_listing_id ?? order.listing_id;
      const listing: any = listingId ? listingMap.get(listingId) : null;
      return {
        id: order.id,
        title: listing?.title_ar ?? listing?.title_en ?? "منتج",
        status: order.status,
        payment_status: order.payment_status,
        quantity: Number(order.quantity ?? 0),
        total_amount: Number(order.total_amount ?? 0),
        currency: order.currency ?? "EGP",
        created_at: order.created_at,
      };
    });

    return {
      store,
      totals: {
        products: listings?.length ?? 0,
        activeProducts: (listings ?? []).filter((item: any) => item.status === "approved").length,
        orders: orders.length,
        paidOrders: paidOrders.length,
        grossRevenue,
        pendingRevenue,
        discounts,
        currency: orders[0]?.currency ?? "EGP",
      },
      statusCounts,
      topProducts,
      lowStock,
      recentOrders,
    };
  });
