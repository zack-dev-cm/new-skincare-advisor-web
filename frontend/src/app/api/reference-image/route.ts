import { readFile } from 'node:fs/promises';

const ASSET_MAP: Record<string, string> = {
  logo:
    'C:\\Dermaself\\new-skincare-advisor-web\\frontend\\public\\shiseido_logo.png',
  heroMen:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\c__Users_MussoLorenzo_AppData_Roaming_Cursor_User_workspaceStorage_6f422aef2f57e4e8ff8690bef94b170e_images_image-325ed99b-d07c-464c-aa06-634bbac92f55.png',
  heroVital:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\c__Users_MussoLorenzo_AppData_Roaming_Cursor_User_workspaceStorage_6f422aef2f57e4e8ff8690bef94b170e_images_image-772f0b8c-24b3-4b70-811a-1c22b802ae1a.png',
  heroUltimune:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\c__Users_MussoLorenzo_AppData_Roaming_Cursor_User_workspaceStorage_6f422aef2f57e4e8ff8690bef94b170e_images_image-dd28a26d-1ce8-41a8-ae64-e34a10437c39.png',
  layoutReference:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\c__Users_MussoLorenzo_AppData_Roaming_Cursor_User_workspaceStorage_6f422aef2f57e4e8ff8690bef94b170e_images_image-6a0ebef7-5869-4c67-97eb-7967dc73b1e2.png',
  bestMicroClick:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\bestseller-micro-click.png',
  bestSkinEmpowering:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\bestseller-skin-empowering-cream.png',
  bestSynchro:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\bestseller-synchro-radiant.png',
  bestUvCompact:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\bestseller-uv-compact.png',
  bestUltimune:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\bestseller-ultimune-iconic.png',
  finderSerum:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\finder-serum.png',
  finderMoisturizer:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\finder-moisturizer.png',
  finderEye:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\finder-eye-treatment.png',
  finderFoundation:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\finder-foundation.png',
  categoryDayCream:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\category-day-cream.png',
  categorySerums:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\category-serums.png',
  categoryFoundation:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\category-foundation.png',
  serviceSerum:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\service-serum-test.png',
  serviceMoisturizer:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\service-moisturizer-choice.png',
  serviceEye:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\service-eye-path.png',
  serviceShade:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\service-shade-match.png',
  editorialUltimune:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\editorial-ultimune.png',
  editorialBlue:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\editorial-shiseido-blue.png',
  editorialVital:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\editorial-vital-perfection.png',
  editorialOffer:
    'C:\\Users\\MussoLorenzo\\.cursor\\projects\\c-Dermaself-new-skincare-advisor-web\\assets\\editorial-offer-neutral.png',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';
  const filePath = ASSET_MAP[id];

  if (!filePath) {
    return new Response('Unknown image id', { status: 404 });
  }

  try {
    const file = await readFile(filePath);
    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Image not available', { status: 404 });
  }
}
