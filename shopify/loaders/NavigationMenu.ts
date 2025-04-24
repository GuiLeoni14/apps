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

function mapToSiteNavigationElement(
  item: MenuItem,
): SiteNavigationElement {
  return {
    "@type": "SiteNavigationElement",
    name: item.title,
    url: item.url,
    children: item.items?.map(mapToSiteNavigationElement),
  };
}

interface Props {
  handle: string;
}

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

  const navigationItems = data.menu.items.map(mapToSiteNavigationElement);

  return navigationItems;
}

export default loader;
