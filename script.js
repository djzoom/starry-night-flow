    if (image.complete && image.naturalWidth !== 0) {
        console.log("Image loaded successfully, width:", image.naturalWidth);
        const screenRatio = canvas.width / canvas.height;
        const imgRatio = image.width / image.height;
        let scale;
        
        if (screenRatio > imgRatio) {
            scale = canvas.width / image.width;
        } else {
            scale = canvas.height / image.height;
        }
        
        imgRenderRect.w = image.width * scale;
        imgRenderRect.h = image.height * scale;
        imgRenderRect.x = (canvas.width - imgRenderRect.w) / 2;
        imgRenderRect.y = (canvas.height - imgRenderRect.h) / 2;

        calculateFlowField();
    }
