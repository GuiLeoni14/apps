import { SiteNavigationElement } from "../../commerce/types.ts";
import { AppContext } from "../../shopify/mod.ts";
import { gql } from "../../utils/graphql.ts";

const GetMenuQuery = {
  query: gql`
    query getMenu($handle: String!) {
      menu(handle: $handle) {
        title
        items {
          title
          url
          items {
            title
            url
            items {
              title
              url
              items {
                title
                url
              }
            }
          }
        }
      }
    }
  `,
};

interface MenuItem {
  title: string;
  url: string;
  items?: MenuItem[];
}

interface MenuQueryResponse {
  menu: {
    title: string;
    items: MenuItem[];
  };
}

interface MenuQueryVariables {
  handle: string;
}

function normalizePath(path?: string, fallback = "/"): string {
  if (!path) return fallback;
  return path.endsWith("/") ? path : `${path}/`;
}

function rewriteShopifyUrl(
  shopifyUrl: string,
  slugs: {
    productPagePath: string;
    categoryPagePath: string;
    singlePagePath: string;
  },
): string {
  try {
    const url = new URL(shopifyUrl);
    const [first, second] = url.pathname.split("/").filter(Boolean);

    switch (first) {
      case "products":
        return `${slugs.productPagePath}${second}`;
      case "collections":
        return `${slugs.categoryPagePath}${second}`;
      case "pages":
        return `${slugs.singlePagePath}${second}`;
      default:
        return url.pathname; // Keep original if it doesn't match
    }
  } catch {
    return shopifyUrl; // Return original if URL is invalid
  }
}

function mapToSiteNavigationElement(
  item: MenuItem,
  slugs: {
    productPagePath: string;
    categoryPagePath: string;
    singlePagePath: string;
  },
): SiteNavigationElement {
  return {
    "@type": "SiteNavigationElement",
    name: item.title,
    url: rewriteShopifyUrl(item.url, slugs),
    children: item.items?.map((child) =>
      mapToSiteNavigationElement(child, slugs)
    ),
  };
}

interface Props {
  /**
   * @title Menu Handle
   * @description Unique identifier of the Shopify menu. Used to fetch navigation items (e.g., "main-menu" or "footer-menu").
   */
  handle: string;

  /**
   * @title Product Page Slug
   * @description Custom path for product pages. For example, "/product/" will transform "/products/rubiks-cube" into "/product/rubiks-cube".
   */
  productPagePath?: string;

  /**
   * @title Category Page Slug
   * @description Custom path for collection/category pages. For example, "/category/" will transform "/collections/building-blocks" into "/category/building-blocks".
   */
  categoryPagePath?: string;

  /**
   * @title Single Page Slug
   * @description Custom path for individual or static pages. For example, "/page/" will transform "/pages/about-us" into "/page/about-us".
   */
  singlePagePath?: string;
}

/**
 * @title Shopify Integration
 * @description Get Menu navigation loader
 */
async function loader(
  props: Props,
  _req: Request,
  ctx: AppContext,
): Promise<SiteNavigationElement[]> {
  const { storefront } = ctx;

  const data = await storefront.query<
    MenuQueryResponse,
    MenuQueryVariables
  >({
    variables: { handle: props.handle },
    ...GetMenuQuery,
  });

  const navigationItems = data?.menu?.items
    ? data?.menu?.items?.map((item: MenuItem) =>
      mapToSiteNavigationElement(item, {
        productPagePath: normalizePath(props.productPagePath, "/product/"),
        categoryPagePath: normalizePath(props.categoryPagePath, "/category/"),
        singlePagePath: normalizePath(props.singlePagePath, "/page/"),
      })
    )
    : [];

  return navigationItems;
}

export default loader;
