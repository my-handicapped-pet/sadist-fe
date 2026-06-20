import React, { useImperativeHandle, useRef } from "react";
import { Cropper, CropperRef } from '@imerljak/react-cropper-2';

interface AvatarEditorProps {
  src?: string;
}

export interface AvatarEditorRef {
  getImageAsPng(): Promise<Blob | null>;
}

const AvatarEditor: React.ForwardRefRenderFunction<AvatarEditorRef> = (props: AvatarEditorProps, ref) => {
  const { src } = props;

  const cropperRef = useRef<CropperRef | null>(null);

  useImperativeHandle(ref, () => {
    return {
      getImageAsPng(): Promise<Blob | null> {
         return cropperRef.current?.getCroppedCanvas({
          width: 100,
          height: 100,
        }).then((canvas) => new Promise<Blob | null>((resolve) => {
          canvas?.toBlob(resolve, 'image/png', 1);
        })) || Promise.resolve(null);
      }
    };
  });

  return <Cropper
      ref={cropperRef}
      src={src || ''}
      alt="Preview"
      aspectRatio={1}
      initialAspectRatio={1}
      initialCoverage={1}
      resizable={true}
      movable={true}
      zoomable={true}
  />;
};

export default React.forwardRef<AvatarEditorRef, AvatarEditorProps>(AvatarEditor);
