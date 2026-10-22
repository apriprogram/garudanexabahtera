// Konteks PhotoSet aktif: template membungkus isinya dengan <PhotoSetContext.Provider value={ARENA_PHOTOS}>, lalu
// setiap <KitPhoto>/<KitAvatar> di dalamnya otomatis mendapat srcset/width/height foto demo template itu.
import { createContext, useContext } from 'react';
import { NO_PHOTOS, type PhotoSet } from './photos';

export const PhotoSetContext = createContext<PhotoSet>(NO_PHOTOS);

export const usePhotoSet = (): PhotoSet => useContext(PhotoSetContext);
