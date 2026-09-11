import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    Tag, Layers, Link2, DollarSign, ImagePlus, FileText,
    RotateCcw, Save, X, Loader2, CheckCircle2, AlertCircle,
    UploadCloud, Trash2, PencilLine,
} from 'lucide-react';
import service from '../../backend/service';
import { slugify } from '../../utils/slug';

const inputClass =
    'w-full rounded-md border border-stone-200 bg-cream px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20';

const inputErrorClass =
    'border-red-300 focus:border-red-600 focus:ring-red-100 dark:border-red-500/40 dark:focus:border-red-500 dark:focus:ring-red-500/20';

const labelClass =
    'mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100';

// initialData = null -> create mode. initialData = row object -> edit mode.
function ProductForm({ initialData, categories, groups, onDone, onCancel }) {
    const isEditMode = Boolean(initialData);
    const fileInputRef = useRef(null);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        setError,
        clearErrors,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            price: initialData?.price ?? '',
            costPrice: initialData?.costPrice ?? '',
            category: initialData?.category || '',
            group: initialData?.group || '',
            slug: initialData?.slug || '',
            fileId: initialData?.fileId || '',
            isReturnable: initialData?.isReturnable ?? false,
        },
    });

    const [submitError, setSubmitError] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [slugAvailable, setSlugAvailable] = useState(null); // null = unknown, true/false = checked
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    // Tracks whether the slug was hand-edited by the user — once they touch
    // it directly, typing in Name stops overwriting it.
    const [slugTouchedManually, setSlugTouchedManually] = useState(false);

    // Mount transition for the card itself — one deliberate entrance, not
    // scattered per-field animation.
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        reset({
            name: initialData?.name || '',
            description: initialData?.description || '',
            price: initialData?.price ?? '',
            costPrice: initialData?.costPrice ?? '',
            category: initialData?.category || '',
            group: initialData?.group || '',
            slug: initialData?.slug || '',
            fileId: initialData?.fileId || '',
            isReturnable: initialData?.isReturnable ?? false,
        });
        setImageFile(null);
        setSlugTouchedManually(false);
        setSlugAvailable(null);
    }, [initialData, reset]);

    // Local preview: a freshly picked file wins, otherwise fall back to the
    // existing product image (edit mode) via the same helper used elsewhere.
    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setImagePreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        if (isEditMode && initialData?.fileId) {
            setImagePreviewUrl(service.getImagePreview({ fileId: initialData.fileId }));
        } else {
            setImagePreviewUrl(null);
        }
    }, [imageFile, isEditMode, initialData]);

    // Auto-generate slug from Name as the user types, unless they've
    // manually edited the Slug field themselves.
    function handleNameChange(e) {
        const value = e.target.value;
        setValue('name', value);
        if (!slugTouchedManually) {
            setValue('slug', slugify(value));
        }
    }

    function handleSlugChange(e) {
        setSlugTouchedManually(true);
        setSlugAvailable(null);
        setValue('slug', e.target.value);
    }

    // On Name blur, make sure the derived slug is checked for uniqueness
    // against the table (in case auto-fill produced a slug that's taken).
    async function handleNameBlur() {
        const currentSlug = watch('slug');
        if (!currentSlug) return;
        await validateSlugUniqueness(currentSlug);
    }

    async function handleSlugBlur() {
        const currentSlug = watch('slug');
        if (!currentSlug) return;
        await validateSlugUniqueness(currentSlug);
    }

    async function validateSlugUniqueness(slugValue) {
        setCheckingSlug(true);
        const available = await service.isSlugAvailable({
            slug: slugValue,
            excludeRowId: isEditMode ? initialData['$id'] : undefined,
        });
        setCheckingSlug(false);
        setSlugAvailable(available);

        if (!available) {
            setError('slug', {
                type: 'manual',
                message: 'This slug is already taken. Try another.',
            });
        } else {
            clearErrors('slug');
        }
        return available;
    }

    function pickImageFile(file) {
        if (!file) return;
        setImageFile(file);
    }

    function handleImageInputChange(e) {
        pickImageFile(e.target.files?.[0] || null);
    }

    function handleDropzoneDragOver(e) {
        e.preventDefault();
        setIsDraggingImage(true);
    }

    function handleDropzoneDragLeave(e) {
        e.preventDefault();
        setIsDraggingImage(false);
    }

    function handleDropzoneDrop(e) {
        e.preventDefault();
        setIsDraggingImage(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            pickImageFile(file);
        }
    }

    function handleClearNewImage(e) {
        e.stopPropagation();
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    const onSubmit = async (formValues) => {
        setSubmitError('');

        // Final safety check right before saving — catches the case where
        // someone else took the slug between blur and submit.
        const stillAvailable = await validateSlugUniqueness(formValues.slug);
        if (!stillAvailable) {
            setSubmitError('Slug is already in use. Please choose a different one.');
            return;
        }

        const data = {
            name: formValues.name,
            description: formValues.description,
            price: Number(formValues.price),
            costPrice: parseInt(formValues.costPrice, 10),
            category: formValues.category,
            group: formValues.group,
            slug: formValues.slug,
            fileId: formValues.fileId,
            isReturnable: Boolean(formValues.isReturnable),
        };

        try {
            // Upload a new image if one was selected (applies to both create and edit)
            if (imageFile) {
                const uploaded = await service.uploadImage({ file: imageFile });
                if (!uploaded) {
                    setSubmitError('Image upload failed. Product was not saved.');
                    return;
                }
                data.fileId = uploaded['$id'];

                // Clean up the old image on edit, but don't block the save if it fails
                if (isEditMode && initialData.fileId) {
                    service.deleteImage({ fileId: initialData.fileId }).catch(() => {});
                }
            }

            const result = isEditMode
                ? await service.updateProduct({ rowId: initialData['$id'], data })
                : await service.addProduct({ data });

            if (!result) {
                setSubmitError(isEditMode ? 'Failed to update product.' : 'Failed to add product.');
                return;
            }

            onDone();
        } catch (err) {
            console.error(err);
            setSubmitError('Something went wrong. Please try again.');
        }
    };

    // categories/groups now arrive as { name: count } maps from service.js
    const categoryNames = Object.keys(categories || {});
    const groupNames = Object.keys(groups || {});
    const isReturnableValue = watch('isReturnable');

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className={`mb-6 space-y-6 rounded-lg border border-stone-200 bg-cream p-5 shadow-sm transition-all duration-300 ease-out dark:border-stone-800 dark:bg-stone-900 sm:p-6 ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
        >
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        {isEditMode ? <PencilLine size={18} /> : <Tag size={18} />}
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                            {isEditMode ? 'Edit Product' : 'Add Product'}
                        </h2>
                        {isEditMode && (
                            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{initialData.name}</p>
                        )}
                    </div>
                </div>
                {isEditMode && isReturnableValue && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <CheckCircle2 size={12} /> Returnable
                    </span>
                )}
            </div>

            {submitError && (
                <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {submitError}
                </p>
            )}

            {/* ---- Identity: name, slug, description ---- */}
            <div className="space-y-4">
                <div>
                    <label className={labelClass}>
                        <FileText size={13} className="text-stone-400 dark:text-stone-500" /> Name
                    </label>
                    <input
                        className={`${inputClass} ${errors.name ? inputErrorClass : ''}`}
                        {...register('name', { required: 'Name is required' })}
                        onChange={handleNameChange}
                        onBlur={handleNameBlur}
                        placeholder="e.g. Handwoven Cotton Rug"
                    />
                    {errors.name && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={11} /> {errors.name.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className={labelClass}>
                        <Link2 size={13} className="text-stone-400 dark:text-stone-500" /> Slug
                        {checkingSlug && (
                            <span className="inline-flex items-center gap-1 text-xs font-normal text-stone-400 dark:text-stone-500">
                                <Loader2 size={11} className="animate-spin" /> checking...
                            </span>
                        )}
                        {!checkingSlug && slugAvailable === true && (
                            <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={11} /> available
                            </span>
                        )}
                    </label>
                    <input
                        className={`${inputClass} ${errors.slug ? inputErrorClass : ''}`}
                        {...register('slug', { required: 'Slug is required' })}
                        onChange={handleSlugChange}
                        onBlur={handleSlugBlur}
                    />
                    <p className="mt-1.5 truncate text-xs text-stone-500 dark:text-stone-400">
                        URL: /{watch('category') || 'category'}/{watch('group') || 'group'}/{watch('slug') || 'slug'}
                    </p>
                    {errors.slug && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={11} /> {errors.slug.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className={labelClass}>
                        <FileText size={13} className="text-stone-400 dark:text-stone-500" /> Description
                    </label>
                    <textarea
                        className={inputClass}
                        rows={3}
                        placeholder="A short description customers will see on the product page"
                        {...register('description')}
                    />
                </div>
            </div>

            <div className="border-t border-stone-100 dark:border-stone-800" />

            {/* ---- Price + Image ---- */}
            <div className="space-y-4">
                <div>
                    <label className={labelClass}>
                        <DollarSign size={13} className="text-stone-400 dark:text-stone-500" /> Price
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        className={`${inputClass} h-14 text-base ${errors.price ? inputErrorClass : ''}`}
                        placeholder="0.00"
                        {...register('price', {
                            required: 'Price is required',
                            min: { value: 0, message: 'Price must be positive' },
                        })}
                    />
                    {errors.price && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={11} /> {errors.price.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className={labelClass}>
                        <DollarSign size={13} className="text-stone-400 dark:text-stone-500" /> Cost Price
                    </label>
                    <input
                        type="number"
                        step="1"
                        className={`${inputClass} h-14 text-base ${errors.costPrice ? inputErrorClass : ''}`}
                        placeholder="0"
                        {...register('costPrice', {
                            required: 'Cost price is required',
                            min: { value: 0, message: 'Cost price must be positive' },
                            validate: (v) => Number.isInteger(Number(v)) || 'Cost price must be a whole number',
                        })}
                    />
                    {errors.costPrice && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={11} /> {errors.costPrice.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className={labelClass}>
                        <ImagePlus size={13} className="text-stone-400 dark:text-stone-500" /> Product Image
                    </label>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageInputChange}
                        className="hidden"
                        id="product-image-input"
                    />

                    <label
                        htmlFor="product-image-input"
                        onDragOver={handleDropzoneDragOver}
                        onDragLeave={handleDropzoneDragLeave}
                        onDrop={handleDropzoneDrop}
                        className={`group flex w-full cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed px-5 py-7 text-left transition-colors ${
                            isDraggingImage
                                ? 'border-brand-500 bg-brand-50/60 dark:border-brand-500 dark:bg-brand-500/10'
                                : 'border-stone-300 bg-stone-50 hover:border-brand-400 hover:bg-brand-50/50 dark:border-stone-700 dark:bg-stone-800/50 dark:hover:border-brand-500 dark:hover:bg-brand-500/5'
                        }`}
                    >
                        {imagePreviewUrl ? (
                            <img
                                src={imagePreviewUrl}
                                alt="Preview"
                                className="h-16 w-16 shrink-0 rounded-md border border-stone-200 object-cover dark:border-stone-700"
                            />
                        ) : (
                            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-stone-800 dark:text-stone-500 dark:group-hover:bg-brand-500/10 dark:group-hover:text-brand-400">
                                <UploadCloud size={26} />
                            </span>
                        )}

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                {imageFile
                                    ? imageFile.name
                                    : imagePreviewUrl
                                    ? 'Change product image'
                                    : 'Click to upload an image'}
                            </p>
                            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                                {imageFile ? 'New image selected — not saved yet' : 'PNG or JPG, drag & drop supported'}
                            </p>
                        </div>

                        {imageFile && (
                            <button
                                type="button"
                                onClick={handleClearNewImage}
                                title="Remove selected image"
                                aria-label="Remove selected image"
                                className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </label>
                </div>
            </div>

            <div className="border-t border-stone-100 dark:border-stone-800" />

            {/* ---- Category + Group ---- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className={labelClass}>
                        <Tag size={13} className="text-stone-400 dark:text-stone-500" /> Category
                    </label>
                    <input
                        list="category-options"
                        className={`${inputClass} ${errors.category ? inputErrorClass : ''}`}
                        {...register('category', { required: 'Category is required' })}
                    />
                    <datalist id="category-options">
                        {categoryNames.map((c) => (
                            <option key={c} value={c} />
                        ))}
                    </datalist>
                    {errors.category && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={11} /> {errors.category.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className={labelClass}>
                        <Layers size={13} className="text-stone-400 dark:text-stone-500" /> Group
                    </label>
                    <input
                        list="group-options"
                        className={`${inputClass} ${errors.group ? inputErrorClass : ''}`}
                        {...register('group', { required: 'Group is required' })}
                    />
                    <datalist id="group-options">
                        {groupNames.map((g) => (
                            <option key={g} value={g} />
                        ))}
                    </datalist>
                    {errors.group && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={11} /> {errors.group.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="border-t border-stone-100 dark:border-stone-800" />

            {/* ---- Returnable toggle ---- */}
            <div className="flex items-center justify-between gap-4 rounded-md border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40">
                <div className="flex items-start gap-2.5">
                    <RotateCcw size={16} className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500" />
                    <div>
                        <label htmlFor="isReturnable" className="block text-sm font-medium text-stone-900 dark:text-stone-100">
                            Returnable
                        </label>
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                            Customers can request a return within 2 days of ordering this product.
                        </p>
                    </div>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                        id="isReturnable"
                        type="checkbox"
                        className="peer sr-only"
                        {...register('isReturnable')}
                    />
                    <div className="h-6 w-11 rounded-full bg-stone-300 transition-colors duration-200 ease-in-out peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-200 dark:bg-stone-700 dark:peer-checked:bg-brand-500 dark:peer-focus-visible:ring-brand-500/30" />
                    <div className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-5" />
                </label>
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <button
                    type="submit"
                    disabled={isSubmitting || checkingSlug}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600 sm:w-auto"
                >
                    {!isSubmitting && <Save size={15} />}
                    {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Product'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 sm:w-auto"
                >
                    <X size={15} />
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default ProductForm;