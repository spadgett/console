import { NavExtension, isNavSection, K8sModel } from '@console/dynamic-plugin-sdk';
import { LoadedExtension } from '@console/dynamic-plugin-sdk/src/types';
import { getReferenceForModel } from '@console/dynamic-plugin-sdk/src/utils/k8s';
import { stripBasePath } from '@console/internal/components/utils';
import { startsWithSome } from '@console/shared';

const toArray = (val) => (val ? (Array.isArray(val) ? val : [val]) : []);

const itemDependsOnItem = (s1: NavExtension, s2: NavExtension): boolean => {
  if (!s1.properties.insertBefore && !s1.properties.insertAfter) {
    return false;
  }
  const before = toArray(s1.properties.insertBefore);
  const after = toArray(s1.properties.insertAfter);
  return before.includes(s2.properties.id) || after.includes(s2.properties.id);
};

const isPositioned = (item: NavExtension, allItems: NavExtension[]): boolean =>
  !!allItems.find((i) => itemDependsOnItem(item, i));

const findInsertBeforeIndex = (item: NavExtension, allItems: NavExtension[]): number => {
  return toArray(item.properties.insertBefore).reduce((index, currentItem) => {
    // take only the first index found
    if (index < 0) {
      return allItems.findIndex((i) => i.properties.id === currentItem);
    }
    return index;
  }, -1);
};

const findInsertAfterIndex = (item: NavExtension, allItems: NavExtension[]): number => {
  return toArray(item.properties.insertAfter).reduce((index, currentItem) => {
    if (index < 0) {
      const newIndex = allItems.findIndex((i) => i.properties.id === currentItem);
      if (newIndex >= 0) {
        return newIndex + 1;
      }
    }
    return index;
  }, -1);
};

const findIndexForItem = (item: NavExtension, allItems: NavExtension[]) => {
  const insertBeforeIndex = findInsertBeforeIndex(item, allItems);
  if (insertBeforeIndex >= 0) {
    return insertBeforeIndex;
  }
  return findInsertAfterIndex(item, allItems);
};

const insertItem = (
  item: LoadedExtension<NavExtension>,
  currentItems: LoadedExtension<NavExtension>[],
): void => {
  const index = findIndexForItem(item, currentItems);
  if (index >= 0) {
    currentItems.splice(index, 0, item);
  } else {
    currentItems.push(item);
  }
};

const insertPositionedItems = (
  insertItems: LoadedExtension<NavExtension>[],
  currentItems: LoadedExtension<NavExtension>[],
): void => {
  if (insertItems.length === 0) {
    return;
  }

  const sortedItems = insertItems.filter((item) => !isPositioned(item, insertItems));
  const positionedItems = insertItems.filter((item) => isPositioned(item, insertItems));

  if (sortedItems.length === 0) {
    // Circular dependencies
    positionedItems.forEach((i) => insertItem(i, currentItems));
    return;
  }

  sortedItems.forEach((i) => insertItem(i, currentItems));
  insertPositionedItems(positionedItems, currentItems);
};

export const getSortedNavExtensions = (
  navItems: LoadedExtension<NavExtension>[],
): LoadedExtension<NavExtension>[] => {
  const sortedItems = navItems.filter((item) => !isPositioned(item, navItems));
  const positionedItems = navItems.filter((item) => isPositioned(item, navItems));
  insertPositionedItems(positionedItems, sortedItems);
  return sortedItems;
};

export const sortExtensionItems = <E extends NavExtension>(
  extensionItems: LoadedExtension<E>[],
): LoadedExtension<E>[] => {
  // Mapped by item id
  const mappedIds = extensionItems.reduce((mem, i) => {
    mem[i.properties.id] = i;
    return mem;
  }, {});

  // determine all dependencies for a given id
  const dependencies = (id: string, currentDependencies: string[] = []): string[] => {
    if (currentDependencies.includes(id)) {
      return [];
    }
    const { insertBefore, insertAfter } = mappedIds[id].properties;
    const before = toArray(insertBefore);
    const after = toArray(insertAfter);
    const dependencyIds = [...before, ...after].filter(
      (i) => i !== id && !currentDependencies.includes(i),
    );
    return dependencyIds.reduce((acc, dependencyId) => {
      if (dependencyId) {
        // Add this dependency and its dependencies
        // eslint-disable-next-line no-param-reassign
        acc = [...acc, dependencyId, ...dependencies(dependencyId, [...acc, dependencyId])];
      }
      return acc;
    }, []);
  };

  const sortItems = (preSorted: NavExtension[], itemsToSort: NavExtension[]): NavExtension[] => {
    if (itemsToSort.length < 2) {
      preSorted.push(...itemsToSort);
      return;
    }

    let sortedItem = false;
    const remainingItems = [];
    itemsToSort.forEach((item) => {
      const deps = dependencies(item.properties.id);
      // If not dependant on any items to be sorted, ok to add it in
      if (!deps.find((id) => itemsToSort.find((i) => i.properties.id === id))) {
        sortedItem = true;
        preSorted.push(item);
      } else {
        // Still has a dependency
        remainingItems.push(item);
      }
    });

    if (remainingItems.length) {
      // If nothing changed, just add the remaining items
      if (!sortedItem) {
        preSorted.push(...remainingItems);
        return;
      }
      // Sort the remaining items
      sortItems(preSorted, remainingItems);
    }
  };

  const sortedItems = [];
  sortItems(sortedItems, extensionItems);

  return sortedItems;
};

// Strips '/<basePath>/k8s/cluster/', '/<basePath>/k8s/ns/<namespace>/', and
// '/<basePath>/k8s/all-namespaces/' from the beginning a given path
export const stripScopeFromPath = (path: string) =>
  stripBasePath(path)?.replace(
    /^\/?(?:k8s\/cluster\/|k8s\/all-namespaces\/|k8s\/ns\/[^/]*\/)?(.*?)\/?$/,
    '$1',
  );

export const navItemHrefIsActive = (
  location: string,
  href: string,
  startsWith?: string[],
): boolean => {
  const scopelessLocation = stripScopeFromPath(location);
  const scopelessHref = stripScopeFromPath(href);
  const locationSegments = scopelessLocation.split('/');
  const hrefSegments = scopelessHref.split('/');
  const hrefMatch = hrefSegments.every((segment, i) => segment === locationSegments?.[i]);
  return hrefMatch || startsWithSome(scopelessLocation, ...(startsWith ?? []));
};

export const navItemResourceIsActive = (
  location: string,
  k8sModel: K8sModel,
  startsWith?: string[],
): boolean => {
  const scopelessPath = stripScopeFromPath(location);
  const [firstSegment] = scopelessPath.split('/');
  const resourceMatches =
    k8sModel &&
    firstSegment &&
    [getReferenceForModel(k8sModel), k8sModel.plural].includes(firstSegment);
  return resourceMatches || startsWithSome(scopelessPath, ...(startsWith ?? []));
};

export const isTopLevelNavItem = (e: LoadedExtension<NavExtension>) =>
  isNavSection(e) || !e.properties.section;
